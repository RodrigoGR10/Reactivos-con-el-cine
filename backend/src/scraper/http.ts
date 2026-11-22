import { setTimeout as delay } from "node:timers/promises";

interface HostState {
    lastRequest: number;
    requestQueue: Promise<void>;
    cooldownUntil: number;
    activeRequests: number;
    waiting: (() => void)[];
}

let interval = 500;
const hosts = new Map<string, HostState>();

function getHostState(url: string): HostState {
    const host = new URL(url).host;
    let state = hosts.get(host);
    if (!state) {
        state = {
            lastRequest: 0,
            requestQueue: Promise.resolve(),
            cooldownUntil: 0,
            activeRequests: 0,
            waiting: [],
        };
        hosts.set(host, state);
    }
    return state;
}

/**
 * Configura el intervalo común entre solicitudes hechas por los scrapers.
 * @param delayMs Tiempo de espera entre solicitudes, en milisegundos.
 */
export function configureRequests(delayMs = 500) {
    if (!Number.isSafeInteger(delayMs) || delayMs < 250)
        throw new Error("La pausa debe ser un entero >= 250 ms.");
    interval = delayMs;
}

async function waitForTurn(state: HostState) {
    const turn = state.requestQueue.then(async () => {
        let wait =
            Math.max(state.lastRequest + interval, state.cooldownUntil) -
            Date.now();
        while (wait > 0) {
            if (wait > 60_000)
                throw new Error(
                    "El cine solicita esperar. Intenta nuevamente mas tarde.",
                );
            await delay(wait);
            wait =
                Math.max(state.lastRequest + interval, state.cooldownUntil) -
                Date.now();
        }
        state.lastRequest = Date.now();
    });
    state.requestQueue = turn.catch(() => {});
    await turn;
}

/**
 * Realiza una solicitud HTTP con el control de tiempo y errores usado por los scrapers.
 * @param url Dirección del recurso que se consulta.
 * @param headers Encabezados que acompañan la respuesta HTTP.
 * @param redirect Indica si la respuesta debe redirigir a otra dirección.
 */
export async function request(
    url: string,
    headers: Record<string, string> = {},
    redirect: "follow" | "manual" = "follow",
): Promise<Response> {
    const state = getHostState(url);
    if (state.activeRequests >= 3) {
        if (state.waiting.length >= 100)
            throw new Error(
                "Hay muchas consultas en curso. Intenta mas tarde.",
            );
        await new Promise<void>((resolve) => state.waiting.push(resolve));
    } else {
        state.activeRequests++;
    }
    try {
        return await performRequest(state, url, headers, redirect);
    } finally {
        const next = state.waiting.shift();
        if (next) next();
        else state.activeRequests--;
    }
}

async function performRequest(
    state: HostState,
    url: string,
    headers: Record<string, string>,
    redirect: "follow" | "manual",
): Promise<Response> {
    for (let attempt = 0; attempt < 3; attempt++) {
        await waitForTurn(state);
        let response: Response;
        try {
            response = await fetch(url, {
                headers: {
                    Accept: "application/json, text/html",
                    "User-Agent": "ReactivosCine/1.0 (cartelera publica)",
                    ...headers,
                },
                redirect,
                signal: AbortSignal.timeout(30_000),
            });
        } catch (error) {
            if (attempt === 2) throw error;
            await delay(1000 * 2 ** attempt);
            continue;
        }
        if (
            response.ok ||
            response.status === 401 ||
            response.status === 403 ||
            (redirect === "manual" &&
                response.status >= 300 &&
                response.status < 400)
        )
            return response;
        if (response.status === 429 || response.status >= 500) {
            await response.body?.cancel();
            const retryAfter = response.headers.get("retry-after");
            const seconds = Number(retryAfter);
            const date = retryAfter ? Date.parse(retryAfter) : NaN;
            const retryMs =
                seconds > 0
                    ? seconds * 1000
                    : Number.isFinite(date)
                      ? date - Date.now()
                      : 1000 * 2 ** attempt;
            if (response.status === 429)
                state.cooldownUntil = Math.max(
                    state.cooldownUntil,
                    Date.now() + Math.max(0, retryMs),
                );
            if (attempt === 2)
                throw new Error(
                    `HTTP ${response.status}: ${new URL(url).hostname}${new URL(url).pathname}`,
                );
            if (retryMs > 60_000)
                throw new Error(
                    `El cine solicita esperar ${retryAfter}. Intenta mas tarde.`,
                );
            await delay(Math.max(0, retryMs));
            continue;
        }
        await response.body?.cancel();
        throw new Error(
            `HTTP ${response.status}: ${new URL(url).hostname}${new URL(url).pathname}`,
        );
    }
    throw new Error("No se pudo consultar el cine.");
}

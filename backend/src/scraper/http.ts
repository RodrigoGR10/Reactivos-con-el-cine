import { setTimeout as delay } from "node:timers/promises";

let interval = 500;
let lastRequest = 0;
let requestQueue = Promise.resolve();
let cooldownUntil = 0;
let activeRequests = 0;
const waiting: (() => void)[] = [];

export function configureRequests(delayMs = 500) {
    if (!Number.isSafeInteger(delayMs) || delayMs < 250)
        throw new Error("La pausa debe ser un entero >= 250 ms.");
    interval = delayMs;
}

async function waitForTurn() {
    const turn = requestQueue.then(async () => {
        let wait = Math.max(lastRequest + interval, cooldownUntil) - Date.now();
        while (wait > 0) {
            if (wait > 60_000)
                throw new Error(
                    "El cine solicita esperar. Intenta nuevamente mas tarde.",
                );
            await delay(wait);
            wait = Math.max(lastRequest + interval, cooldownUntil) - Date.now();
        }
        lastRequest = Date.now();
    });
    requestQueue = turn.catch(() => {});
    await turn;
}

export async function request(
    url: string,
    headers: Record<string, string> = {},
    redirect: "follow" | "manual" = "follow",
): Promise<Response> {
    if (activeRequests >= 3) {
        if (waiting.length >= 100)
            throw new Error(
                "Hay muchas consultas en curso. Intenta mas tarde.",
            );
        await new Promise<void>((resolve) => waiting.push(resolve));
    } else {
        activeRequests++;
    }
    try {
        return await performRequest(url, headers, redirect);
    } finally {
        const next = waiting.shift();
        if (next) next();
        else activeRequests--;
    }
}

async function performRequest(
    url: string,
    headers: Record<string, string>,
    redirect: "follow" | "manual",
): Promise<Response> {
    for (let attempt = 0; attempt < 3; attempt++) {
        await waitForTurn();
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
                cooldownUntil = Math.max(
                    cooldownUntil,
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

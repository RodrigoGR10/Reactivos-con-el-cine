import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { startChromeSession, type ChromeSession } from "./browser.ts";
import { API_KEY } from "./client.ts";

const IDLE_CLOSE_MS = 60_000;
const QUEUE_TIMEOUT_MS = 120_000;

class CinepolisResponseError extends Error {
    readonly cerrarNavegador: boolean;

    constructor(message: string, cerrarNavegador: boolean) {
        super(message);
        this.cerrarNavegador = cerrarNavegador;
    }
}

let browser: ChromeSession | undefined;
let queue = Promise.resolve();
let pending = 0;
let idle: ReturnType<typeof setTimeout> | undefined;
let lastRequest = 0;
let cooldownUntil = 0;

/**
 * Ejecuta una consulta al servicio de Cinépolis con reintentos y control de respuesta.
 * @param operationName Nombre de la operación GraphQL que se enviará a Cinépolis.
 * @param query Sentencia SQL parametrizada que se ejecutará.
 * @param variables Variables que acompañan a la operación GraphQL.
 * @returns Datos encontrados, o `null` cuando el registro no existe.
 */
export async function consultaCinepolis<T>(
    operationName: string,
    query: string,
    variables: Record<string, string>,
): Promise<T> {
    if (pending >= 100)
        throw new Error(
            "Hay muchas consultas de Cinepolis en curso. Intenta mas tarde.",
        );
    pending++;
    clearTimeout(idle);
    const queuedAt = Date.now();
    // Precios y butacas comparten un navegador y una cola; solo se ejecutan consultas de lectura.
    const task = queue
        .then(async () => {
            if (Date.now() - queuedAt > QUEUE_TIMEOUT_MS) {
                throw new CinepolisResponseError(
                    "La consulta de Cinepolis tardo demasiado. Intenta nuevamente.",
                    false,
                );
            }
            if (Date.now() < cooldownUntil) {
                throw new CinepolisResponseError(
                    "Cinepolis no permite consultar ahora. Intenta mas tarde.",
                    false,
                );
            }
            browser ??= await startChromeSession({
                profileDir: path.join(
                    process.env.CHROME_USER_DATA_DIR || os.tmpdir(),
                    "cinepolis-chrome-prices-profile",
                ),
            });
            const cfg = { apiKey: API_KEY, operationName, query, variables };
            await delay(Math.max(0, lastRequest + 500 - Date.now()));
            lastRequest = Date.now();
            const response = await browser.evaluate<{
                status: number;
                json: { data?: unknown; errors?: unknown[] } | null;
            }>(`(async (cfg) => {
      const response = await fetch("https://api-g.cinepolis.com/v1/ticket/graphql", {
        method: "POST",
        headers: { "content-type": "application/json", "country-id": "CL", "x-apikey": cfg.apiKey },
        body: JSON.stringify({ operationName: cfg.operationName, query: cfg.query, variables: cfg.variables }),
        signal: AbortSignal.timeout(30000),
      });
      let json = null;
      try { json = await response.json(); } catch {}
      return { status: response.status, json };
    })(${JSON.stringify(cfg)})`);
            if (response.status === 403 || response.status === 429)
                cooldownUntil = Date.now() + 60_000;
            if (
                response.status !== 200 ||
                !response.json ||
                response.json.errors?.length ||
                !response.json.data
            ) {
                throw new CinepolisResponseError(
                    `Cinepolis no devolvio los datos de la funcion (HTTP ${response.status}).`,
                    response.status === 403,
                );
            }
            return response.json as T;
        })
        .catch((error: unknown) => {
            if (
                !(error instanceof CinepolisResponseError) ||
                error.cerrarNavegador
            ) {
                browser?.close();
                browser = undefined;
            }
            throw error;
        })
        .finally(() => {
            pending--;
            if (pending === 0)
                idle = setTimeout(() => {
                    browser?.close();
                    browser = undefined;
                }, IDLE_CLOSE_MS);
        });
    queue = task.then(
        () => {},
        () => {},
    );
    return task;
}

import { configureRequests, request } from "../http.ts";

export const SITE = "https://www.cineplanet.cl";
const API = `${SITE}/v3`;
let config: { key: string; token: string; loadedAt: number } | undefined;
let initialization: Promise<void> | undefined;

function publicConfig(source: string) {
    const reference = (field: string) =>
        source.match(
            new RegExp(
                `['"]${field}['"]\\s*:\\s*[\\w$]+\\((0x[\\da-f]+|\\d+)\\)`,
                "i",
            ),
        )?.[1];
    const literal = (field: string) =>
        source.match(
            new RegExp(`['"]${field}['"]\\s*:\\s*['"]([^'"]+)['"]`, "i"),
        )?.[1];
    const anchors = [
        ["microservices", API],
        ["cms", "https://cdn.cineplanet.cl"],
        ["web", SITE],
        ["country", "CL"],
    ] as const;
    if (!anchors.some(([field]) => reference(field) || literal(field))) {
        throw new Error("Cineplanet cambio su configuracion publica.");
    }
    for (const match of source.matchAll(
        /\b(?:var|const|let)\s+[\w$]+\s*=\s*\[/g,
    )) {
        const start = source.indexOf("[", match.index);
        const end = source.indexOf("]", start);
        const raw = source.slice(start, end + 1);
        if (
            !/^\[(?:'[\w+/=]*'|"[\w+/=]*")(?:,(?:'[\w+/=]*'|"[\w+/=]*"))*\]$/.test(
                raw,
            )
        )
            continue;
        const encoded: string[] = JSON.parse(raw.replaceAll("'", '"'));
        const alphabet =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
        const standard =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        const values = encoded.map((value) =>
            Buffer.from(
                [...value]
                    .map((char) => standard[alphabet.indexOf(char)])
                    .join(""),
                "base64",
            ).toString("utf8"),
        );
        let anchor: string | undefined;
        let position = -1;
        for (const [field, expected] of anchors) {
            const ref = reference(field);
            const pos = values.indexOf(expected);
            if (ref && pos >= 0) {
                anchor = ref;
                position = pos;
                break;
            }
        }
        if (!anchor || position < 0) continue;
        const read = (field: string) => {
            const direct = literal(field);
            if (direct) return direct;
            const index = reference(field);
            if (!index)
                throw new Error(
                    `Falta ${field} en la configuracion publica de Cineplanet.`,
                );
            return values[
                (((Number(index) - Number(anchor) + position) % values.length) +
                    values.length) %
                    values.length
            ];
        };
        const key = read("apiManagerTokenMicroservices");
        const token = read("microservicesToken");
        if (
            !/^[a-f\d]{32}$/i.test(key) ||
            !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)
        )
            throw new Error("Configuracion publica de Cineplanet invalida.");
        return { key, token, loadedAt: Date.now() };
    }
    throw new Error("No se encontro la configuracion publica de Cineplanet.");
}

/**
 * Inicializa el cliente de Cineplanet y respeta el intervalo entre solicitudes.
 * @param delayMs Tiempo de espera entre solicitudes, en milisegundos.
 */
export async function initializeCineplanet(delayMs = 500) {
    configureRequests(delayMs);
    if (config && Date.now() - config.loadedAt < 60 * 60_000) return;
    if (!initialization)
        initialization = (async () => {
            const response = await request(SITE);
            if (!response.ok) {
                await response.body?.cancel();
                throw new Error(`Cineplanet HTTP ${response.status}.`);
            }
            const html = await response.text();
            const script = html.match(
                /<script\b[^>]*\bsrc=["']([^"']*main\.[^"']+\.js)["']/i,
            )?.[1];
            if (!script)
                throw new Error("Cineplanet no publico su archivo principal.");
            const url = new URL(script, SITE);
            if (url.origin !== SITE)
                throw new Error(
                    "El archivo principal no corresponde a Cineplanet Chile.",
                );
            const bundle = await request(url.href);
            if (!bundle.ok) {
                await bundle.body?.cancel();
                throw new Error(`Cineplanet HTTP ${bundle.status}.`);
            }
            config = publicConfig(await bundle.text());
        })().finally(() => {
            initialization = undefined;
        });
    await initialization;
}

/**
 * Consulta un recurso de Cineplanet y devuelve la respuesta con el tipo indicado.
 * @param path Ruta relativa del recurso solicitado.
 * @returns Respuesta tipada entregada por el proveedor.
 */
export async function cineplanetData<T>(path: string): Promise<T> {
    if (
        !/^\/api\/(?:cache\/(?:cinemas|movies|session)cache|sessionavailable\/cinema\/\d+\/session\/\d+|gettickets\/cinema\/\d+\/session\/\d+\/usersessionid\/[a-f\d]{32})$/.test(
            path,
        )
    )
        throw new Error("Consulta de Cineplanet no permitida.");
    for (let attempt = 0; attempt < 2; attempt++) {
        if (!config || Date.now() - config.loadedAt >= 60 * 60_000)
            await initializeCineplanet();
        const current = config!;
        const response = await request(`${API}${path}`, {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": current.key,
            Authorization: `Bearer ${current.token}`,
            Origin: SITE,
            Referer: `${SITE}/`,
        });
        if (!response.ok) {
            await response.body?.cancel();
            if (
                attempt === 0 &&
                (response.status === 401 || response.status === 403)
            ) {
                if (config === current) config = undefined;
                continue;
            }
            throw new Error(
                `Cineplanet HTTP ${response.status}: ${path.split("/usersessionid/")[0]}`,
            );
        }
        return (await response.json()) as T;
    }
    throw new Error("No se pudo consultar Cineplanet.");
}

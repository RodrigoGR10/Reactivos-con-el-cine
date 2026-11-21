import type { Server } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import app from "../../app.ts";

/**
 * Levanta la app Express en un puerto efimero y expone un cliente fetch.
 * Asi los tests recorren ruta -> controlador -> servicio -> PostgreSQL real.
 */

let servidor: Server | null = null;
let baseUrl = "";

export async function iniciarApi(): Promise<string> {
    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    const { port } = servidor.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    return baseUrl;
}

export async function detenerApi(): Promise<void> {
    if (!servidor) return;

    const servidorActual = servidor;
    servidor = null;

    await new Promise<void>((resolve, reject) => {
        servidorActual.close((error) => (error ? reject(error) : resolve()));
    });
}

export function api(ruta: string, init?: RequestInit): Promise<Response> {
    return fetch(`${baseUrl}${ruta}`, init);
}

export function jsonRequest(
    ruta: string,
    metodo: string,
    cuerpo: unknown,
    headers: Record<string, string> = {},
): Promise<Response> {
    return api(ruta, {
        method: metodo,
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(cuerpo),
    });
}

/** Une las cookies de Set-Cookie en el formato que espera fetch. */
export function cookiesDe(respuesta: Response): string {
    return respuesta.headers
        .getSetCookie()
        .map((cookie) => cookie.split(";")[0])
        .join("; ");
}

export interface SesionApi {
    cookie: string;
    csrf: string;
}

export async function registrarUsuario(datos: {
    nombre: string;
    email: string;
    contrasena: string;
}): Promise<{ respuesta: Response; sesion: SesionApi }> {
    const respuesta = await jsonRequest("/api/auth/register", "POST", datos);

    return {
        respuesta,
        sesion: {
            cookie: cookiesDe(respuesta),
            csrf: respuesta.headers.get("x-csrf-token") ?? "",
        },
    };
}

export function peticionAutenticada(
    sesion: SesionApi,
    ruta: string,
    init: RequestInit = {},
): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("cookie", sesion.cookie);
    headers.set("x-csrf-token", sesion.csrf);
    if (init.body) headers.set("content-type", "application/json");

    return api(ruta, { ...init, headers });
}

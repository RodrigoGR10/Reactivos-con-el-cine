import { CACHE_BUTACAS_MS } from "../estadoButacas.ts";
import { carteleraCinemark, carteleraVista } from "./proveedores.ts";
import type { CarteleraButacas, OrigenCartelera } from "./types.ts";

const carteleras = new Map<
    string,
    { hasta: number; consulta: Promise<CarteleraButacas> }
>();

/**
 * Devuelve la cartelera con ocupacion de un cine, reutilizando la consulta en
 * vuelo o la ultima respuesta vigente.
 */
export async function carteleraButacas(
    origen: OrigenCartelera,
    cineId: string,
) {
    // Cinemark publica la ocupacion por cine. Vista publica disponibles para toda la cadena.
    const clave = origen === "cinemark" ? `${origen}:${cineId}` : origen;
    const anterior = carteleras.get(clave);
    if (anterior && anterior.hasta > Date.now()) return anterior.consulta;

    const consulta = (
        origen === "cinemark"
            ? carteleraCinemark(cineId)
            : carteleraVista(origen)
    ).catch((error: unknown) => {
        carteleras.delete(clave);
        throw error;
    });

    carteleras.set(clave, {
        hasta: Date.now() + CACHE_BUTACAS_MS,
        consulta,
    });
    return consulta;
}

import type { Cine } from "../types/types.ts";
import type { Ubicacion } from "../hooks/useUbicacion.ts";
import { distanciaKM } from "./distancia.ts";
import { normalizarTexto } from "./normalizarTexto.ts";

const cadenas = [
    { id: "cinemark", nombre: "Cinemark", logo: "/cinemark.png" },
    { id: "cineplanet", nombre: "Cineplanet", logo: "/cineplanet.png" },
    { id: "cinepolis", nombre: "Cin\u00e9polis", logo: "/cinepolis.png" },
    { id: "muvix", nombre: "Muvix" },
    { id: "cinestar", nombre: "Cine Star" },
];

export interface OpcionComuna {
    valor: string;
    nombre: string;
    cantidad: number;
}

export interface CineOrdenado extends Cine {
    distancia: number;
    favorito: boolean;
}

export interface GrupoCines {
    id: string;
    nombre: string;
    logo?: string;
    cines: CineOrdenado[];
}

export function obtenerCadena(cine: Cine): Omit<GrupoCines, "cines"> {
    const origen = normalizarTexto(cine.origen ?? "");
    const nombre = normalizarTexto(cine.nombre).replaceAll(" ", "");
    return cadenas.find((cadena) => cadena.id === origen)
        ?? cadenas.find((cadena) => nombre.includes(cadena.id))
        ?? { id: "otros", nombre: "Otros cines" };
}

export function obtenerComunas(cines: readonly Cine[]): OpcionComuna[] {
    const comunas = new Map<string, OpcionComuna>();
    for (const cine of cines) {
        const nombre = cine.comuna.trim().replace(/\s+/g, " ");
        const valor = normalizarTexto(nombre);
        if (!valor) continue;
        const anterior = comunas.get(valor);
        comunas.set(valor, {
            valor,
            nombre: !anterior || /\p{Diacritic}/u.test(nombre.normalize("NFD")) ? nombre : anterior.nombre,
            cantidad: (anterior?.cantidad ?? 0) + 1,
        });
    }
    return [...comunas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CL"));
}

export function filtrarCines(cines: readonly Cine[], busqueda: string, comunas: readonly string[]): Cine[] {
    const termino = normalizarTexto(busqueda.trim());
    const seleccionadas = new Set(comunas);
    return cines.filter((cine) => {
        const comuna = normalizarTexto(cine.comuna.trim().replace(/\s+/g, " "));
        return (normalizarTexto(cine.nombre).includes(termino) || comuna.includes(termino))
            && (!seleccionadas.size || seleccionadas.has(comuna));
    });
}

export function agruparCines(cines: readonly Cine[], favoritos: readonly string[], ubicacion: Ubicacion | null): GrupoCines[] {
    const idsFavoritos = new Set(favoritos);
    const grupos = new Map<string, GrupoCines>();
    const habituales: GrupoCines = { id: "favoritos", nombre: "Tus cines habituales", cines: [] };
    for (const cine of cines) {
        const cadena = obtenerCadena(cine);
        const ordenado: CineOrdenado = {
            ...cine,
            favorito: idsFavoritos.has(cine.id),
            distancia: ubicacion && cine.latitud != null && cine.longitud != null
                ? distanciaKM(ubicacion.latitud, ubicacion.longitud, cine.latitud, cine.longitud)
                : Infinity,
        };
        if (ordenado.favorito) {
            habituales.cines.push(ordenado);
            continue;
        }
        const grupo = grupos.get(cadena.id) ?? { ...cadena, cines: [] };
        grupo.cines.push(ordenado);
        grupos.set(cadena.id, grupo);
    }
    const resultado = [habituales, ...cadenas.map((cadena) => grupos.get(cadena.id)), grupos.get("otros")]
        .filter((grupo): grupo is GrupoCines => Boolean(grupo?.cines.length));
    for (const grupo of resultado) {
        grupo.cines.sort((a, b) => (a.distancia === b.distancia ? 0 : a.distancia - b.distancia)
            || a.nombre.localeCompare(b.nombre, "es-CL") || a.id.localeCompare(b.id));
    }
    return resultado;
}

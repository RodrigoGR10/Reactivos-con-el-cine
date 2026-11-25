import type { Cine } from "../types/types.ts";
import type { Ubicacion } from "../hooks/useUbicacion.ts";
import { distanciaKM } from "./distancia.ts";
import { normalizarTexto } from "./normalizarTexto.ts";

const cadenas = [
    { id: "cinemark", nombre: "Cinemark", logo: "/cinemark.png" },
    { id: "cineplanet", nombre: "Cineplanet", logo: "/cineplanet.png" },
    { id: "cinepolis", nombre: "Cin\u00e9polis", logo: "/cinepolis.png" },
    { id: "muvix", nombre: "Muvix", logo: "/muvix.png" },
    { id: "cinestar", nombre: "Cine Star", logo: "/cinestar.png" },
];

/**
 * Comuna disponible y cantidad de cines que contiene.
 */
export interface OpcionComuna {
    valor: string;
    nombre: string;
    cantidad: number;
}

/**
 * Cine con sus datos de distancia y prioridad para ordenar resultados.
 */
export interface CineOrdenado extends Cine {
    distancia: number;
    favorito: boolean;
}

/**
 * Cines agrupados por comuna para mostrarlos en la interfaz.
 */
export interface GrupoCines {
    id: string;
    nombre: string;
    logo?: string;
    cines: CineOrdenado[];
}

/**
 * Identifica la cadena a la que pertenece un cine por origen o nombre.
 * @param cine Cine que se desea clasificar.
 * @returns Identificador, nombre y logo de la cadena, o el grupo Otros.
 */
export function obtenerCadena(cine: Cine): Omit<GrupoCines, "cines"> {
    const origen = normalizarTexto(cine.origen ?? "");
    const nombre = normalizarTexto(cine.nombre).replaceAll(" ", "");
    return (
        cadenas.find((cadena) => cadena.id === origen) ??
        cadenas.find((cadena) => nombre.includes(cadena.id)) ?? {
            id: "otros",
            nombre: "Otros cines",
        }
    );
}

/**
 * Elige el logo local conocido y usa la URL del cine como alternativa.
 * @param cine Cine cuyo logo se necesita.
 * @returns URL del logo o `undefined` si no hay imagen configurada.
 */
export function obtenerLogoCine(cine: Cine): string | undefined {
    return obtenerCadena(cine).logo || cine.logo || undefined;
}

/**
 * Agrupa cines por comuna, unifica tildes y cuenta sus establecimientos.
 * @param cines Cines disponibles en el catálogo.
 * @returns Opciones de comuna ordenadas alfabéticamente.
 */
export function obtenerComunas(cines: readonly Cine[]): OpcionComuna[] {
    const comunas = new Map<string, OpcionComuna>();
    for (const cine of cines) {
        const nombre = cine.comuna.trim().replace(/\s+/g, " ");
        const valor = normalizarTexto(nombre);
        if (!valor) continue;
        const anterior = comunas.get(valor);
        comunas.set(valor, {
            valor,
            nombre:
                !anterior || /\p{Diacritic}/u.test(nombre.normalize("NFD"))
                    ? nombre
                    : anterior.nombre,
            cantidad: (anterior?.cantidad ?? 0) + 1,
        });
    }
    return [...comunas.values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es-CL"),
    );
}

/**
 * Cuenta cuántos cines hay por cadena para construir opciones de filtro.
 * @param cines Cines disponibles en el catálogo.
 * @returns Opciones de cadena con su conteo.
 */
export function obtenerCadenas(cines: readonly Cine[]): OpcionComuna[] {
    const mapa = new Map<string, OpcionComuna>();
    for (const cine of cines) {
        const cadena = obtenerCadena(cine);
        const anterior = mapa.get(cadena.id);
        mapa.set(cadena.id, {
            valor: cadena.id,
            nombre: cadena.nombre,
            cantidad: (anterior?.cantidad ?? 0) + 1,
        });
    }
    return [...mapa.values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es-CL"),
    );
}

/**
 * Filtra cines por nombre/comuna, comunas seleccionadas y cadenas.
 * @param cines Cines candidatos.
 * @param busqueda Texto a comparar sin distinguir tildes ni mayúsculas.
 * @param comunas Comunas seleccionadas; lista vacía no filtra por comuna.
 * @param cadenasSeleccionadas Cadenas activas; por defecto no filtra por cadena.
 * @returns Cines que cumplen todos los filtros activos.
 */
export function filtrarCines(
    cines: readonly Cine[],
    busqueda: string,
    comunas: readonly string[],
    cadenasSeleccionadas: readonly string[] = [],
): Cine[] {
    const termino = normalizarTexto(busqueda.trim());
    const seleccionadas = new Set(comunas);
    const cadenasSet = new Set(cadenasSeleccionadas);
    return cines.filter((cine) => {
        const comuna = normalizarTexto(cine.comuna.trim().replace(/\s+/g, " "));
        return (
            (normalizarTexto(cine.nombre).includes(termino) ||
                comuna.includes(termino)) &&
            (!seleccionadas.size || seleccionadas.has(comuna)) &&
            (!cadenasSet.size || cadenasSet.has(obtenerCadena(cine).id))
        );
    });
}

/**
 * Calcula distancias y ordena los cines desde la ubicación indicada.
 * @param cines Cines que se van a ordenar.
 * @param favoritos Identificadores que deben marcarse como favoritos.
 * @param ubicacion Coordenadas de referencia en grados.
 * @returns Cines con distancia calculada, ordenados de menor a mayor.
 */
export function ordenarCinesPorCercania(
    cines: readonly Cine[],
    favoritos: readonly string[],
    ubicacion: Ubicacion,
): CineOrdenado[] {
    const idsFavoritos = new Set(favoritos);
    return cines
        .map((cine) => ({
            ...cine,
            favorito: idsFavoritos.has(cine.id),
            distancia:
                cine.latitud != null && cine.longitud != null
                    ? distanciaKM(
                          ubicacion.latitud,
                          ubicacion.longitud,
                          cine.latitud,
                          cine.longitud,
                      )
                    : Infinity,
        }))
        .sort(
            (a, b) =>
                (a.distancia === b.distancia ? 0 : a.distancia - b.distancia) ||
                a.nombre.localeCompare(b.nombre, "es-CL") ||
                a.id.localeCompare(b.id),
        );
}

/**
 * Separa favoritos y cadenas, y ordena los cines dentro de cada grupo.
 * @param cines Cines que aparecerán en el directorio.
 * @param favoritos Identificadores de cines favoritos.
 * @param ubicacion Coordenadas opcionales para calcular cercanía.
 * @returns Grupos de favoritos y cadenas con sus cines ordenados.
 */
export function agruparCines(
    cines: readonly Cine[],
    favoritos: readonly string[],
    ubicacion: Ubicacion | null,
): GrupoCines[] {
    const idsFavoritos = new Set(favoritos);
    const grupos = new Map<string, GrupoCines>();
    const habituales: GrupoCines = {
        id: "favoritos",
        nombre: "Tus cines habituales",
        cines: [],
    };
    for (const cine of cines) {
        const cadena = obtenerCadena(cine);
        const ordenado: CineOrdenado = {
            ...cine,
            favorito: idsFavoritos.has(cine.id),
            distancia:
                ubicacion && cine.latitud != null && cine.longitud != null
                    ? distanciaKM(
                          ubicacion.latitud,
                          ubicacion.longitud,
                          cine.latitud,
                          cine.longitud,
                      )
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
    const resultado = [
        habituales,
        ...cadenas.map((cadena) => grupos.get(cadena.id)),
        grupos.get("otros"),
    ].filter((grupo): grupo is GrupoCines => Boolean(grupo?.cines.length));
    for (const grupo of resultado) {
        grupo.cines.sort(
            (a, b) =>
                (a.distancia === b.distancia ? 0 : a.distancia - b.distancia) ||
                a.nombre.localeCompare(b.nombre, "es-CL") ||
                a.id.localeCompare(b.id),
        );
    }
    return resultado;
}

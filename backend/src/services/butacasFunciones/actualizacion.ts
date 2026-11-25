import { query } from "../../db.ts";
import { CACHE_BUTACAS_MS } from "../estadoButacas.ts";
import { cargarHorario } from "../preciosFunciones/horarios.ts";
import type {
    ScheduleRow,
    ScheduleWithPrices,
} from "../preciosFunciones/types.ts";
import { carteleraButacas } from "./carteleras.ts";
import { consultarButacasSesion } from "./proveedores.ts";
import type { Butacas } from "../../scraper/butacas.ts";
import type { Origen } from "../../scraper/types.ts";
import type { OrigenCartelera } from "./types.ts";

const consultas = new Map<string, Promise<ScheduleWithPrices | null>>();

const esOrigenCartelera = (origen: Origen): origen is OrigenCartelera =>
    origen === "cinemark" || origen === "muvix" || origen === "cinestar";

async function guardarButacas(row: ScheduleRow, butacas: Butacas | undefined) {
    const actualizadasEn = butacas?.consultadasEn ?? new Date().toISOString();

    await query(
        `
        UPDATE horarios
        SET butacas_revision = $2,
            butacas_actualizadas_en = $3::timestamptz,
            butacas_disponibles = $4,
            butacas_total = $5,
            butacas_consultadas_en = $6::timestamptz,
            agotada = COALESCE($7, agotada),
            butacas_error_hasta = NULL,
            butacas_error_revision = NULL
        WHERE id = $1 AND revision = $2;
        `,
        [
            row.id,
            row.revision,
            actualizadasEn,
            butacas ? butacas.disponibles : null,
            butacas?.total ?? null,
            butacas ? butacas.consultadasEn : null,
            butacas ? butacas.disponibles === 0 : null,
        ],
    );
}

async function registrarError(row: ScheduleRow) {
    await query(
        `
        UPDATE horarios
        SET butacas_error_hasta = NOW() + INTERVAL '60 seconds',
            butacas_error_revision = $2
        WHERE id = $1 AND revision = $2;
        `,
        [row.id, row.revision],
    );
}

async function resolverButacas(
    row: ScheduleRow,
    precargadas?: Map<string, Butacas | undefined>,
): Promise<Butacas | undefined> {
    const cineOrigenId = row.cine_origen_id;
    const butacas =
        row.origen === "cinepolis" && precargadas?.has(row.sesion_id)
            ? precargadas.get(row.sesion_id)
            : await consultarButacasSesion(
                  row.origen,
                  cineOrigenId,
                  row.sesion_id,
              );

    if (butacas || !esOrigenCartelera(row.origen)) return butacas;

    const fecha = String(row.fecha).slice(0, 10);
    const horario = String(row.horario).slice(0, 5);
    const sesiones = await carteleraButacas(row.origen, cineOrigenId);
    const sesion = sesiones.get(`${cineOrigenId}:${row.sesion_id}`);

    if (
        !sesion ||
        sesion.fecha !== fecha ||
        sesion.horario !== horario ||
        (sesion.peliculaId &&
            row.pelicula_origen_id &&
            sesion.peliculaId !== row.pelicula_origen_id)
    ) {
        return undefined;
    }

    return sesion.butacas;
}

/** Indica si el estado guardado de butacas de la funcion ya no es vigente.
 * @param row Fila de base de datos que se transforma o evalúa.
 * @param ahora Fecha y hora actual usada como referencia.
 * @returns Resultado que indica si se cumple la condición evaluada.
 */
export function necesitaConsultarButacas(
    row: ScheduleRow,
    ahora: number,
): boolean {
    const actualizadasMs = row.butacas_actualizadas_en
        ? new Date(row.butacas_actualizadas_en).getTime()
        : 0;
    const errorHastaMs = row.butacas_error_hasta
        ? new Date(row.butacas_error_hasta).getTime()
        : 0;

    if (
        row.butacas_revision === row.revision &&
        actualizadasMs > ahora - CACHE_BUTACAS_MS
    ) {
        return false;
    }
    if (row.butacas_error_revision === row.revision && errorHastaMs > ahora) {
        return false;
    }
    return true;
}

/**
 * Consulta las butacas de una funcion si su estado guardado ya no es vigente,
 * deduplicando consultas simultaneas y registrando el error para reintentar.
 * @param row Fila de base de datos que se transforma o evalúa.
 * @param precargadas Datos de horarios o tarifas que ya se cargaron previamente.
 */
export async function actualizarHorario(
    row: ScheduleRow,
    precargadas?: Map<string, Butacas | undefined>,
): Promise<ScheduleWithPrices | null> {
    if (!necesitaConsultarButacas(row, Date.now())) {
        return cargarHorario(row.id);
    }

    const clave = `${row.id}:${row.revision}`;
    const pendiente = consultas.get(clave);
    if (pendiente) return pendiente;

    const consulta = (async () => {
        try {
            const butacas = await resolverButacas(row, precargadas);
            await guardarButacas(row, butacas);
        } catch (error) {
            console.warn(
                `No se pudieron consultar butacas de ${row.origen}, sesion ${row.sesion_id}:`,
                error instanceof Error ? error.message : "Error desconocido",
            );
            await registrarError(row);
        }
        return cargarHorario(row.id);
    })().finally(() => consultas.delete(clave));

    consultas.set(clave, consulta);
    return consulta;
}

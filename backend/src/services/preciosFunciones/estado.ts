import type { ScheduleRow, ScheduleWithPrices } from "./types.ts";

export const CACHE_PRECIOS_MS = 15 * 60_000;

export function isFresh(row: ScheduleRow, now = Date.now()): boolean {
    return (
        row.precios_revision === row.revision &&
        row.precios_consultados_en !== null &&
        now - new Date(row.precios_consultados_en).getTime() < CACHE_PRECIOS_MS
    );
}

export function horarioPublico(row: ScheduleWithPrices) {
    const compatible =
        row.precios_revision === row.revision &&
        row.precios_consultados_en !== null;
    const fresh =
        compatible &&
        Date.now() - new Date(row.precios_consultados_en!).getTime() <
            CACHE_PRECIOS_MS;

    const tarifas = compatible ? row.tarifas : [];

    const estadoPrecio = row.agotada
        ? "agotada"
        : fresh
          ? tarifas.length
              ? "disponible"
              : "sin_tarifa"
          : row.consulta_precios_revision === row.revision &&
              row.consulta_precios_hasta !== null &&
              new Date(row.consulta_precios_hasta).getTime() > Date.now()
            ? "consultando"
            : row.precios_error_revision === row.revision &&
                row.precios_error_hasta !== null &&
                new Date(row.precios_error_hasta).getTime() > Date.now()
              ? "error"
              : tarifas.length
                ? "desactualizado"
                : "pendiente";

    return {
        id: String(row.id),
        peliculaId: String(row.pelicula_id),
        cineId: row.cine_id,
        fecha: row.fecha,
        fechaCartelera: row.fecha_cartelera,
        horario: String(row.horario).slice(0, 5),
        formatoResumen: row.formato_resumen,
        idioma: row.idioma,
        sala: row.sala,
        agotada: row.agotada,
        estadoPrecio,
        preciosConsultadosEn: compatible
            ? new Date(row.precios_consultados_en!).toISOString()
            : undefined,
        reintentarEn:
            row.precios_error_revision === row.revision &&
            row.precios_error_hasta
                ? new Date(row.precios_error_hasta).toISOString()
                : undefined,
        tarifas: tarifas.map((tarifa) => ({
            id: String(tarifa.id),
            origenId: tarifa.origen_id,
            tipoEntrada: tarifa.tipo_entrada,
            formato: tarifa.formato,
            precio: tarifa.precio === null ? undefined : Number(tarifa.precio),
            cargoServicio:
                tarifa.cargo_servicio === null
                    ? undefined
                    : Number(tarifa.cargo_servicio),
            precioOnline: Number(tarifa.precio_online),
            urlCompra:
                row.origen === "cineplanet"
                    ? tarifa.url_compra.replace(/\/entradas$/, "/asientos")
                    : tarifa.url_compra,
            extraidoEn: new Date(tarifa.extraido_en).toISOString(),
            peliculaId: String(row.pelicula_id),
            cineId: row.cine_id,
            agotada: row.agotada,
        })),
    };
}

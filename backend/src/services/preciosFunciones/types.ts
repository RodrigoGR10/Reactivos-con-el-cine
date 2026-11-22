import type { Origen } from "../../scraper/types.ts";

/**
 * Forma de una fila de base de datos utilizada por la consulta y actualización de precios de funciones.
 */
export type ScheduleRow = {
    id: number;
    origen_id: string;
    pelicula_id: number;
    cine_id: string;
    origen: Origen;
    pelicula_origen_id: string;
    pelicula_url: string | null;
    sesion_id: string;
    fecha: string;
    horario: string;
    fecha_cartelera: string;
    formato_resumen: string;
    idioma: string;
    sala: string;
    agotada: boolean;
    url_compra: string | null;
    revision: string;
    precios_revision: string | null;
    precios_consultados_en: Date | null;
    precios_error_revision: string | null;
    precios_error_hasta: Date | null;
    consulta_precios_revision: string | null;
    consulta_precios_hasta: Date | null;
    consulta_precios_token: string | null;
    butacas_disponibles: number | null;
    butacas_total: number | null;
    butacas_consultadas_en: Date | null;
    butacas_revision: string | null;
    butacas_actualizadas_en: Date | null;
    butacas_error_hasta: Date | null;
    butacas_error_revision: string | null;
    cine_origen_id: string;
    cine_nombre: string;
    cine_cadena?: string;
    cine_url: string | null;
    pelicula_url_fuente: string | null;
    pelicula_origen_id_fuente: string;
};

/**
 * Forma de una fila de base de datos utilizada por la consulta y actualización de precios de funciones.
 */
export type TarifaRow = {
    id: number;
    origen_id: string;
    horario_id: number;
    tipo_entrada: string;
    formato: string;
    precio: number | null;
    cargo_servicio: number | null;
    precio_online: number;
    url_compra: string;
    extraido_en: Date;
};

/**
 * Datos normalizados de una función para la cartelera común.
 */
export type ScheduleWithPrices = ScheduleRow & {
    tarifas: TarifaRow[];
};

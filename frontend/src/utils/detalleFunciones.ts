import type { Horario } from "../types/types.ts";

export const COOLDOWN_DETALLE_MS = 5 * 60_000;
export const EXPIRACION_DETALLE_MS = 60 * 60_000;

/**
 * Estado agregado de consulta para un horario de función.
 */
export type DetalleHorario = Partial<
    Pick<
        Horario,
        | "tarifas"
        | "estadoPrecio"
        | "preciosConsultadosEn"
        | "reintentarEn"
        | "urlCompra"
        | "butacas"
        | "estadoButacas"
        | "butacasReintentarEn"
        | "agotada"
    >
>;

/**
 * Resultado parcial recibido durante la consulta de una función.
 */
export interface RegistroConsulta {
    consultadoEn: number;
    falloPrecios: boolean;
    falloButacas: boolean;
}

/**
 * Progreso general de la consulta de precios y disponibilidad.
 */
export interface ProgresoDetalle {
    porcentaje: number;
}

/**
 * Estado de carga y error de un grupo de resultados de funciones.
 */
export interface EstadoDetalleGrupo {
    cargando: boolean;
    revelado: boolean;
    /** Revela las tarjetas tambien durante la consulta, para mostrar resultados parciales. */
    mostrarDetalle: boolean;
    enCooldown: boolean;
    consultadoEn: number | null;
    avisoError: string | null;
    progreso: ProgresoDetalle | null;
}

/**
 * Tipo de resultado parcial emitido por el flujo de detalle.
 */
export type TipoDetalle = "precios" | "butacas";

const CAMPOS_DETALLE = {
    precios: [
        "tarifas",
        "estadoPrecio",
        "preciosConsultadosEn",
        "reintentarEn",
        "urlCompra",
    ],
    butacas: ["butacas", "estadoButacas", "butacasReintentarEn"],
} as const satisfies Record<TipoDetalle, readonly (keyof DetalleHorario)[]>;

/**
 * Extrae solo precios o butacas para combinar respuestas que llegan por separado.
 * @param horarios Horarios devueltos por el endpoint consultado.
 * @param tipo Indica si el detalle parcial contiene precios o butacas.
 * @returns Mapa indexado por ID de horario con los campos recibidos.
 */
export function extraerDetalleParcial(
    horarios: Horario[],
    tipo: TipoDetalle,
): Record<string, DetalleHorario> {
    return Object.fromEntries(
        horarios.map((h) => [
            h.id,
            Object.fromEntries(
                CAMPOS_DETALLE[tipo].map((campo) => [campo, h[campo]]),
            ),
        ]),
    );
}

/**
 * Genera el aviso de espera según progreso o tiempo transcurrido.
 * @param segundos Segundos desde que comenzó la consulta.
 * @param totalFunciones Número de funciones consultadas.
 * @param progreso Avance porcentual opcional informado por la API.
 * @returns Texto para mostrar o `null` mientras la espera sea breve.
 */
export function mensajeEsperaDetalle(
    segundos: number,
    totalFunciones: number,
    progreso?: ProgresoDetalle | null,
): string | null {
    if (progreso && progreso.porcentaje > 0) {
        return segundos >= 40
            ? `${progreso.porcentaje}% · tardando más de lo normal…`
            : `${progreso.porcentaje}%`;
    }
    if (segundos < 4) return null;
    if (segundos < 15) {
        return totalFunciones === 1
            ? "Consultando 1 función…"
            : `Consultando ${totalFunciones} funciones…`;
    }
    if (segundos < 40) return "Algunos cines tardan más en responder…";
    return "Está tardando más de lo normal…";
}

/**
 * Crea una clave única para asociar datos de una película, cine y fecha.
 * @param peliculaId Identificador de película.
 * @param cineId Identificador de cine.
 * @param fecha Fecha de la función.
 * @returns Clave compuesta separada por dos puntos.
 */
export const claveDetalle = (
    peliculaId: string,
    cineId: string,
    fecha: string,
) => `${peliculaId}:${cineId}:${fecha}`;

/**
 * Convierte una fecha ISO a milisegundos Unix.
 * @param iso Marca de tiempo opcional recibida desde la API.
 * @returns Milisegundos o `null` si falta o no es válida.
 */
export function parsearTimestamp(iso?: string): number | null {
    if (!iso) return null;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : null;
}

/**
 * Formatea cuánto tiempo ha pasado desde la última consulta.
 * @param consultadoEn Marca de tiempo de la consulta, en milisegundos.
 * @param ahora Instante de referencia, en milisegundos.
 * @returns Etiqueta relativa localizada en español.
 */
export function formatearTiempoRelativo(
    consultadoEn: number,
    ahora: number,
): string {
    const minutos = Math.max(0, Math.floor((ahora - consultadoEn) / 60_000));
    if (minutos < 1) return "Actualizado hace un momento";
    if (minutos === 1) return "Actualizado hace 1 minuto";
    return `Actualizado hace ${minutos} minutos`;
}

/**
 * Comprueba si el grupo tiene datos completos aún dentro del cooldown de 5 minutos.
 * @param horarios Horarios y marcas de consulta que se evalúan.
 * @param ahora Instante actual en milisegundos.
 * @returns Marca más antigua reutilizable o `null` si corresponde consultar de nuevo.
 */
export function obtenerCacheMenorACincoMinutos(
    horarios: Horario[],
    ahora: number,
): number | null {
    if (!horarios.length) return null;
    const timestamps: number[] = [];

    for (const h of horarios) {
        if (h.estadoPrecio === "error" || h.estadoButacas === "error")
            return null;

        const pTs = parsearTimestamp(h.preciosConsultadosEn);
        const bTs = parsearTimestamp(h.butacas?.consultadasEn);

        if (h.agotada) {
            if (pTs !== null) {
                if (ahora - pTs >= COOLDOWN_DETALLE_MS) return null;
                timestamps.push(pTs);
            }
            if (bTs !== null) {
                if (ahora - bTs >= COOLDOWN_DETALLE_MS) return null;
                timestamps.push(bTs);
            }
            continue;
        }

        if (
            pTs === null ||
            ahora - pTs >= COOLDOWN_DETALLE_MS ||
            h.estadoPrecio === "pendiente" ||
            h.estadoPrecio === "consultando"
        ) {
            return null;
        }
        timestamps.push(pTs);

        if (bTs !== null) {
            if (ahora - bTs >= COOLDOWN_DETALLE_MS) return null;
            timestamps.push(bTs);
        } else if (h.estadoButacas !== "sin_datos") {
            return null;
        }
    }

    if (!timestamps.length) return null;
    // Evita tiempos negativos si el reloj del servidor adelanta unos segundos al navegador.
    const masAntiguo = Math.min(...timestamps, ahora);
    return ahora - masAntiguo < COOLDOWN_DETALLE_MS ? masAntiguo : null;
}

/**
 * Oculta tarifas o butacas que fallaron o superaron una hora de vigencia.
 * @param h Horario que contiene el detalle recibido.
 * @param ahora Instante actual en milisegundos.
 * @param opciones Fallos de los endpoints parciales, si alguno ocurrió.
 * @returns Solo datos vigentes que se pueden mostrar al usuario.
 */
export function sanitizarDetalleHorario(
    h: Horario,
    ahora: number,
    opciones?: { falloPrecios?: boolean; falloButacas?: boolean },
): DetalleHorario {
    const pTs = parsearTimestamp(h.preciosConsultadosEn);
    const precioExpirado = pTs !== null && ahora - pTs >= EXPIRACION_DETALLE_MS;
    const precioInvalido =
        Boolean(opciones?.falloPrecios) ||
        h.estadoPrecio === "error" ||
        h.estadoPrecio === "pendiente" ||
        h.estadoPrecio === "consultando" ||
        precioExpirado;

    const bTs = parsearTimestamp(h.butacas?.consultadasEn);
    const butacasExpiradas =
        bTs !== null && ahora - bTs >= EXPIRACION_DETALLE_MS;
    const butacasInvalidas =
        Boolean(opciones?.falloButacas) ||
        h.estadoButacas === "error" ||
        h.estadoButacas === "pendiente" ||
        butacasExpiradas;

    // No heredar agotada si las butacas expiraron o fallaron y tampoco hay estado agotado vigente en precio.
    const agotada = butacasInvalidas
        ? h.estadoPrecio === "agotada" && !precioInvalido
        : Boolean(h.agotada);

    return {
        tarifas: precioInvalido ? [] : h.tarifas,
        estadoPrecio: precioInvalido
            ? h.estadoPrecio === "error" || opciones?.falloPrecios
                ? "error"
                : "pendiente"
            : h.estadoPrecio,
        preciosConsultadosEn: precioInvalido
            ? undefined
            : h.preciosConsultadosEn,
        reintentarEn: h.reintentarEn,
        urlCompra: h.urlCompra,
        butacas: butacasInvalidas ? undefined : h.butacas,
        estadoButacas: butacasInvalidas
            ? h.estadoButacas === "error" || opciones?.falloButacas
                ? "error"
                : "pendiente"
            : h.estadoButacas,
        butacasReintentarEn: h.butacasReintentarEn,
        agotada,
    };
}

/**
 * Comprueba si algún precio o butaca todavía está dentro de una hora de vigencia.
 * @param horarios Horarios que contienen las marcas de tiempo.
 * @param ahora Instante actual en milisegundos.
 * @returns `true` si al menos un dato puede seguir mostrándose.
 */
export function tieneAlgunaVigenciaMenorASesentaMin(
    horarios: Horario[],
    ahora: number,
): boolean {
    return horarios.some((h) => {
        const pTs = parsearTimestamp(h.preciosConsultadosEn);
        const bTs = parsearTimestamp(h.butacas?.consultadasEn);
        const precioVigente =
            (pTs !== null && ahora - pTs < EXPIRACION_DETALLE_MS) ||
            h.estadoPrecio === "agotada";
        const butacasVigentes =
            (bTs !== null && ahora - bTs < EXPIRACION_DETALLE_MS) ||
            h.estadoButacas === "sin_datos";
        return precioVigente || butacasVigentes;
    });
}

/**
 * Calcula carga, vigencia, cooldown, progreso y avisos para una cabecera.
 * @param consulta Resultado registrado para el grupo, si ya se consultó.
 * @param cargando Si hay una consulta en curso.
 * @param ahora Instante actual en milisegundos.
 * @param progreso Progreso parcial opcional de la consulta activa.
 * @returns Estado visual calculado para el grupo de funciones.
 */
export function resolverEstadoGrupo(
    consulta: RegistroConsulta | undefined,
    cargando: boolean,
    ahora: number,
    progreso: ProgresoDetalle | null = null,
): EstadoDetalleGrupo {
    const revelado =
        Boolean(consulta) &&
        ahora - (consulta?.consultadoEn ?? 0) < EXPIRACION_DETALLE_MS;
    const enCooldown =
        revelado &&
        Boolean(consulta) &&
        ahora - (consulta?.consultadoEn ?? 0) < COOLDOWN_DETALLE_MS;

    let avisoError: string | null = null;
    if (revelado && consulta) {
        if (consulta.falloPrecios && consulta.falloButacas) {
            avisoError = "Datos no disponibles";
        } else if (consulta.falloPrecios) {
            avisoError = "Precio no disponible";
        } else if (consulta.falloButacas) {
            avisoError = "Butacas no disponibles";
        }
    }

    return {
        cargando,
        revelado,
        mostrarDetalle: revelado || cargando,
        enCooldown,
        consultadoEn: revelado && consulta ? consulta.consultadoEn : null,
        avisoError,
        progreso: cargando ? progreso : null,
    };
}

/**
 * Prepara un horario para ocultar o revelar solo los datos de detalle vigentes.
 * @param horario Horario base recibido al cargar la vista.
 * @param detalle Datos parciales de precio o butacas disponibles.
 * @param revelado Si la interfaz debe mostrar el detalle del horario.
 * @param ahora Instante actual usado para comprobar vigencia.
 * @param cargando Si hay nuevas respuestas parciales en camino.
 * @returns Horario listo para entregarse a la tarjeta.
 */
export function prepararHorarioParaTarjeta(
    horario: Horario,
    detalle: DetalleHorario | undefined,
    revelado: boolean,
    ahora: number,
    cargando = false,
): Horario {
    if (!revelado) {
        return {
            ...horario,
            tarifas: [],
            butacas: undefined,
            agotada: false,
            estadoPrecio: "pendiente",
            estadoButacas: "pendiente",
        };
    }

    if (cargando) {
        const parcial: Horario = {
            ...horario,
            tarifas: detalle?.tarifas ?? [],
            estadoPrecio: detalle?.estadoPrecio ?? "pendiente",
            preciosConsultadosEn: detalle?.preciosConsultadosEn,
            reintentarEn: detalle?.reintentarEn,
            urlCompra: detalle?.urlCompra ?? horario.urlCompra,
            butacas: detalle?.butacas,
            estadoButacas: detalle?.estadoButacas ?? "pendiente",
            butacasReintentarEn: detalle?.butacasReintentarEn,
            agotada: Boolean(detalle?.agotada),
        };
        return {
            ...parcial,
            ...sanitizarDetalleHorario(parcial, ahora),
        };
    }

    const fusionado = { ...horario, ...detalle };
    return {
        ...fusionado,
        ...sanitizarDetalleHorario(fusionado, ahora),
    };
}

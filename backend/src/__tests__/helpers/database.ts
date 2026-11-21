import bcrypt from "bcrypt";
import { query } from "../../db.ts";
import { localNow } from "../../utils/localNow.ts";

/**
 * Helpers de siembra para los tests de integracion.
 *
 * Cada archivo limpia la base antes de cada test y crea solo los registros
 * que necesita, de modo que los resultados no dependan del orden de ejecucion
 * ni de datos reales de la base de desarrollo.
 */

let secuencia = 0;

const siguiente = () => ++secuencia;

const diaLocal = (desplazamientoDias: number) =>
    localNow(new Date(Date.now() + desplazamientoDias * 86_400_000)).slice(
        0,
        10,
    );

export async function limpiarBaseDeDatos(): Promise<void> {
    await query(`
        TRUNCATE TABLE
            vistas_peliculas,
            favoritos_peliculas,
            favoritos_cines,
            tarifas,
            horarios,
            pelicula_fuentes,
            peliculas,
            cines,
            users
        RESTART IDENTITY CASCADE;
    `);
}

export interface CineSeed {
    id?: string;
    nombre?: string;
    direccion?: string;
    comuna?: string;
    ciudad?: string | null;
    cadena?: string;
    origenId?: string;
    url?: string | null;
    logoUrl?: string | null;
    latitud?: number | null;
    longitud?: number | null;
}

export async function crearCine(seed: CineSeed = {}) {
    const cadena = seed.cadena ?? "cinemark";
    const origenId = seed.origenId ?? String(siguiente());
    const id = seed.id ?? `${cadena}:${origenId}`;

    const { rows } = await query(
        `
        INSERT INTO cines (
            id, nombre, direccion, comuna, ciudad, cadena, origen_id,
            url, logo_url, latitud, longitud
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
        `,
        [
            id,
            seed.nombre ?? `Cine ${origenId}`,
            seed.direccion ?? "Av. Siempre Viva 123",
            seed.comuna ?? "Santiago",
            seed.ciudad ?? "Santiago",
            cadena,
            origenId,
            seed.url ?? `https://cines.test/${cadena}/${origenId}`,
            seed.logoUrl ?? null,
            seed.latitud ?? null,
            seed.longitud ?? null,
        ],
    );

    return rows[0]!;
}

export interface PeliculaSeed {
    titulo?: string;
    tituloOriginal?: string | null;
    sinopsis?: string | null;
    duracion?: number | null;
    genero?: string | null;
    clasificacion?: string | null;
    imagenUrl?: string | null;
    posterLimpio?: string | null;
    banner?: string | null;
    tmdbId?: number | null;
    calificacionTmdb?: number | null;
    votosTmdb?: number | null;
    popularidadTmdb?: number | null;
    fechaEstrenoTmdb?: string | null;
    trailerUrl?: string | null;
    trailerIdioma?: string | null;
    trailerVersion?: string | null;
}

export async function crearPelicula(seed: PeliculaSeed = {}) {
    const { rows } = await query(
        `
        INSERT INTO peliculas (
            titulo, titulo_original, sinopsis, duracion, genero, clasificacion,
            imagen_url, poster_limpio, banner, tmdb_id, calificacion_tmdb,
            votos_tmdb, popularidad_tmdb, fecha_estreno_tmdb,
            trailer_url, trailer_idioma, trailer_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *;
        `,
        [
            seed.titulo ?? `Pelicula ${siguiente()}`,
            seed.tituloOriginal ?? null,
            seed.sinopsis ?? "Sinopsis de prueba.",
            seed.duracion ?? 120,
            seed.genero ?? "Drama",
            seed.clasificacion ?? "TE+7",
            seed.imagenUrl ?? "https://img.test/poster.jpg",
            seed.posterLimpio ?? null,
            seed.banner ?? null,
            seed.tmdbId ?? null,
            seed.calificacionTmdb ?? null,
            seed.votosTmdb ?? null,
            seed.popularidadTmdb ?? null,
            seed.fechaEstrenoTmdb ?? null,
            seed.trailerUrl ?? null,
            seed.trailerIdioma ?? null,
            seed.trailerVersion ?? null,
        ],
    );

    return rows[0]!;
}

export interface FuenteSeed {
    peliculaId: number;
    origen?: string;
    origenId?: string;
    url?: string | null;
    estadoEstreno?: "cartelera" | "preventa" | "proximamente" | null;
    fechaEstreno?: string | null;
}

export async function crearFuente(seed: FuenteSeed) {
    const origen = seed.origen ?? "cinemark";
    const origenId = seed.origenId ?? `p${seed.peliculaId}-${siguiente()}`;

    const { rows } = await query(
        `
        INSERT INTO pelicula_fuentes (
            origen, origen_id, pelicula_id, url, estado_estreno, fecha_estreno
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
        `,
        [
            origen,
            origenId,
            seed.peliculaId,
            seed.url ?? `https://cines.test/${origen}/pelicula/${origenId}`,
            seed.estadoEstreno ?? null,
            seed.fechaEstreno ?? null,
        ],
    );

    return rows[0]!;
}

export interface HorarioSeed {
    peliculaId: number;
    cineId: string;
    origen?: string;
    origenId?: string;
    peliculaOrigenId?: string;
    peliculaUrl?: string | null;
    sesionId?: string;
    fecha?: string;
    horario?: string;
    fechaCartelera?: string;
    formatoResumen?: string | null;
    idioma?: string | null;
    sala?: string;
    agotada?: boolean;
    urlCompra?: string | null;
    revision?: string;
    preciosFrescos?: boolean;
    butacasFrescas?: boolean;
}

export async function crearHorario(seed: HorarioSeed) {
    const cine = (
        await query<{ cadena: string; origen_id: string }>(
            "SELECT cadena, origen_id FROM cines WHERE id = $1",
            [seed.cineId],
        )
    ).rows[0];

    if (!cine) {
        throw new Error(
            `Debes crear el cine ${seed.cineId} antes de sembrar un horario.`,
        );
    }

    const origen = seed.origen ?? cine.cadena;
    const sesionId = seed.sesionId ?? `sesion-${siguiente()}`;
    const fecha = seed.fecha ?? diaLocal(1);
    const horario = seed.horario ?? "20:00";
    const revision = seed.revision ?? "rev-1";
    const preciosFrescos = seed.preciosFrescos ?? true;
    const butacasFrescas = seed.butacasFrescas ?? true;

    const { rows } = await query(
        `
        INSERT INTO horarios (
            origen_id, pelicula_id, cine_id, origen, pelicula_origen_id,
            pelicula_url, sesion_id, fecha, horario, fecha_cartelera,
            formato_resumen, idioma, sala, agotada, url_compra, revision,
            extraido_en, precios_revision, precios_consultados_en,
            butacas_disponibles, butacas_total, butacas_consultadas_en,
            butacas_revision, butacas_actualizadas_en
        )
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16,
            NOW(), $17, $18,
            $19, $20, $21,
            $22, $23
        )
        RETURNING *;
        `,
        [
            seed.origenId ?? `${origen}:${sesionId}`,
            seed.peliculaId,
            seed.cineId,
            origen,
            seed.peliculaOrigenId ?? `m${seed.peliculaId}`,
            seed.peliculaUrl ?? null,
            sesionId,
            fecha,
            horario,
            seed.fechaCartelera ?? fecha,
            seed.formatoResumen ?? "2D",
            seed.idioma ?? "Doblada",
            seed.sala ?? "Sala 1",
            seed.agotada ?? false,
            seed.urlCompra ?? null,
            revision,
            preciosFrescos ? revision : null,
            preciosFrescos ? new Date() : null,
            butacasFrescas ? 80 : null,
            butacasFrescas ? 100 : null,
            butacasFrescas ? new Date() : null,
            butacasFrescas ? revision : null,
            butacasFrescas ? new Date() : null,
        ],
    );

    return rows[0]!;
}

export interface TarifaSeed {
    horarioId: number;
    origenId?: string;
    tipoEntrada?: string;
    formato?: string;
    precio?: number | null;
    cargoServicio?: number | null;
    precioOnline?: number;
    urlCompra?: string;
    extraidoEn?: Date;
}

export async function crearTarifa(seed: TarifaSeed) {
    const { rows } = await query(
        `
        INSERT INTO tarifas (
            origen_id, horario_id, tipo_entrada, formato, precio,
            cargo_servicio, precio_online, url_compra, extraido_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
        `,
        [
            seed.origenId ?? `tarifa-${siguiente()}`,
            seed.horarioId,
            seed.tipoEntrada ?? "General",
            seed.formato ?? "2D",
            seed.precio ?? 5000,
            seed.cargoServicio ?? null,
            seed.precioOnline ?? 5500,
            seed.urlCompra ?? "https://cines.test/compra",
            seed.extraidoEn ?? new Date(),
        ],
    );

    return rows[0]!;
}

export interface UsuarioSeed {
    email?: string;
    nombre?: string;
    contrasena?: string;
}

export async function crearUsuario(seed: UsuarioSeed = {}) {
    const email = seed.email ?? `usuario${siguiente()}@test.cl`;
    const contrasena = seed.contrasena ?? "secreto123";
    const passwordHash = await bcrypt.hash(contrasena, 4);

    const { rows } = await query(
        `
        INSERT INTO users (email, password_hash, nombre)
        VALUES ($1, $2, $3)
        RETURNING id, email, nombre, creado_en;
        `,
        [email, passwordHash, seed.nombre ?? "Usuario de prueba"],
    );

    return { ...rows[0]!, contrasena };
}

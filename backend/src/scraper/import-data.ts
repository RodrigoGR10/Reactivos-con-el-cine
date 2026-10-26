import { pool } from "../db.ts";
import type { ScrapedCinema, ScrapedMovie, ScrapedSession } from "./types.ts";

export async function importarDatosScraped(
    cines: ScrapedCinema[],
    peliculas: ScrapedMovie[],
    funciones: ScrapedSession[],
) {
    const client = await pool.connect();

    try {
        // 1. Iniciar transacción atómica
        await client.query("BEGIN");

        // 1. Insertar / Actualizar Cines (Upsert)
        for (const cine of cines) {
            const sqlCine = `
                INSERT INTO cines (id, nombre, direccion, comuna, ciudad, cadena, origen_id, logo_url, latitud, longitud)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO UPDATE SET
                  nombre = EXCLUDED.nombre,
                  direccion = EXCLUDED.direccion,
                  comuna = EXCLUDED.comuna,
                  ciudad = EXCLUDED.ciudad,
                  logo_url = EXCLUDED.logo_url,
                  latitud = EXCLUDED.latitud,
                  longitud = EXCLUDED.longitud;
            `;
            await client.query(sqlCine, [
                cine.id,
                cine.nombre,
                cine.direccion,
                cine.comuna,
                cine.ciudad,
                cine.origen,
                cine.origenId || cine.id,
                cine.logo,
                cine.latitud ?? null,
                cine.longitud ?? null,
            ]);
        }

        const mapaPeliculasId = new Map<string, number>();

        // 2. Insertar / Actualizar Películas y Fuentes
        for (const pelicula of peliculas) {
            const sqlPelicula = `
                INSERT INTO peliculas (titulo, sinopsis, duracion, genero, clasificacion, imagen_url, banner, tmdb_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id;
            `;

            const resultPeli = await client.query(sqlPelicula, [
                pelicula.titulo,
                pelicula.sinopsis,
                pelicula.duracion,
                pelicula.genero,
                pelicula.clasificacion,
                pelicula.poster,
                null,
                null,
            ]);

            const internalPeliId = resultPeli.rows[0].id;
            mapaPeliculasId.set(pelicula.id, internalPeliId);

            const [origenExtraido, origenIdExtraido] = pelicula.id.split(":");

            const fechaEstrenoValida =
                "fechaEstreno" in pelicula &&
                typeof pelicula.fechaEstreno === "string"
                    ? pelicula.fechaEstreno
                    : "fechaEstrenoISO" in pelicula &&
                        typeof (pelicula as any).fechaEstrenoISO === "string"
                      ? (pelicula as any).fechaEstrenoISO
                      : null;

            const estadoEstreno =
                (pelicula as any).estadoEstreno || "cartelera";

            const sqlFuente = `
                INSERT INTO pelicula_fuentes (origen, origen_id, pelicula_id, url, estado_estreno, fecha_estreno)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (origen, origen_id) DO UPDATE SET
                    url = EXCLUDED.url,
                    estado_estreno = EXCLUDED.estado_estreno,
                    fecha_estreno = EXCLUDED.fecha_estreno;
            `;
            await client.query(sqlFuente, [
                origenExtraido || "desconocido",
                origenIdExtraido || pelicula.id,
                internalPeliId,
                pelicula.url || null,
                estadoEstreno,
                fechaEstrenoValida,
            ]);
        }

        // 3. Limpiar horarios pasados
        await client.query(
            "DELETE FROM horarios WHERE (fecha + horario) < (NOW() AT TIME ZONE 'America/Santiago');",
        );

        // 4. Insertar Horarios y Tarifas masivamente
        for (const funcion of funciones) {
            const internalPeliId = mapaPeliculasId.get(funcion.peliculaId);
            if (!internalPeliId) {
                console.warn(
                    `Pelicula ID ${funcion.peliculaId} no encontrado para la funcion ${funcion.id}`,
                );
                continue;
            }

            const [origenFuncion, origenIdFuncion] = funcion.id.split(":");

            const sqlHorario = `
                INSERT INTO horarios (origen_id, pelicula_id, cine_id, origen, pelicula_origen_id, sesion_id, fecha, horario, fecha_cartelera, formato_resumen, sala, agotada, revision, extraido_en)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                RETURNING id;
            `;

            const resultHorario = await client.query(sqlHorario, [
                funcion.id,
                internalPeliId,
                funcion.cineId,
                origenFuncion || "desconocido",
                funcion.peliculaId,
                funcion.id, // Usamos el id de la función como sesion_id
                funcion.fecha,
                funcion.horario,
                funcion.fecha,
                funcion.formato,
                funcion.sala,
                funcion.agotada ?? false,
                "rev-1",
            ]);

            const internalHorarioId = resultHorario.rows[0].id;

            const precioFinal = funcion.precioOnline ?? funcion.precio ?? 0;
            const sqlTarifa = `
                INSERT INTO tarifas (origen_id, horario_id, tipo_entrada, formato, precio, precio_online, url_compra, extraido_en)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
            `;
            await client.query(sqlTarifa, [
                `tarifa-${funcion.id}`,
                internalHorarioId,
                "General",
                funcion.formato,
                funcion.precio || precioFinal,
                precioFinal,
                "#",
            ]);
        }

        // 6. Confirmar cambios en la base de datos
        await client.query("COMMIT");
        console.log("Importación masiva completada con éxito.");
    } catch (error) {
        // Si algo falla, revertimos toda la transacción
        await client.query("ROLLBACK");
        console.error(
            "Error en la importación masiva. Transacción revertida:",
            error,
        );
        throw error;
    } finally {
        // Liberar la conexión devuelta al pool
        client.release();
    }
}

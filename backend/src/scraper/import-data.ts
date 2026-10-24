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

        // 2. Insertar / Actualizar Cines (Upsert)
        for (const cine of cines) {
            const sqlCine = `
        INSERT INTO cines (id, nombre, direccion, comuna, ciudad, cadena, logo_url, latitud, longitud)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          direccion = EXCLUDED.direccion,
          comuna = EXCLUDED.comuna,
          ciudad = EXCLUDED.ciudad,
          cadena = EXCLUDED.cadena,
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
                cine.origen, // 'origen' mapea a la columna 'cadena' en la BD
                cine.logo, // 'logo' es la URL de la imagen del cine
                cine.latitud ?? null,
                cine.longitud ?? null,
            ]);
        }

        // 3. Insertar / Actualizar Películas (Upsert)
        for (const pelicula of peliculas) {
            const sqlPelicula = `
        INSERT INTO peliculas (id, titulo, sinopsis, duracion, genero, clasificacion, imagen_url, fecha_estreno)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          titulo = EXCLUDED.titulo,
          sinopsis = EXCLUDED.sinopsis,
          duracion = EXCLUDED.duracion,
          genero = EXCLUDED.genero,
          clasificacion = EXCLUDED.clasificacion,
          imagen_url = EXCLUDED.imagen_url,
          fecha_estreno = EXCLUDED.fecha_estreno;
      `;

            // Mapeo seguro para la fecha de estreno desde DatosEstreno
            const fechaEstrenoValida =
                "fechaEstreno" in pelicula &&
                typeof pelicula.fechaEstreno === "string"
                    ? pelicula.fechaEstreno
                    : "fechaEstrenoISO" in pelicula &&
                        typeof (pelicula as any).fechaEstrenoISO === "string"
                      ? (pelicula as any).fechaEstrenoISO
                      : null;

            await client.query(sqlPelicula, [
                pelicula.id,
                pelicula.titulo,
                pelicula.sinopsis,
                pelicula.duracion,
                pelicula.genero,
                pelicula.clasificacion,
                pelicula.poster, // 'poster' mapea a la columna 'imagen_url'
                fechaEstrenoValida,
            ]);
        }

        // 4. Limpiar funciones obsoletas pasadas
        await client.query("DELETE FROM funciones WHERE fecha_hora < NOW();");

        // 5. Insertar Funciones masivamente
        for (const funcion of funciones) {
            const sqlFuncion = `
        INSERT INTO funciones (id, pelicula_id, cine_id, fecha_hora, precio, sala, formato, agotada)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          precio = EXCLUDED.precio,
          sala = EXCLUDED.sala,
          formato = EXCLUDED.formato,
          agotada = EXCLUDED.agotada;
      `;

            // Concatenar fecha ("YYYY-MM-DD") y horario ("HH:MM") para formar un ISO String de Timestamp válido
            const fechaHoraISO =
                funcion.fecha && funcion.horario
                    ? new Date(
                          `${funcion.fecha}T${funcion.horario}:00`,
                      ).toISOString()
                    : new Date().toISOString();

            // Priorizar el precio online o el precio normal, defaulteando a 0
            const precioFinal = funcion.precioOnline ?? funcion.precio ?? 0;

            await client.query(sqlFuncion, [
                funcion.id,
                funcion.peliculaId,
                funcion.cineId,
                fechaHoraISO,
                precioFinal,
                funcion.sala,
                funcion.formato,
                funcion.agotada ?? false,
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

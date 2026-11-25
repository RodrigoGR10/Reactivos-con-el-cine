import type { PoolClient } from "pg";
import type { ScrapedCinema } from "../types.ts";
import { normalizarComuna } from "../../utils/comunas.ts";

/**
 * Crea o actualiza un cine extraído, usando su identificador de origen.
 * @param client Cliente PostgreSQL usado para ejecutar consultas dentro de la transacción.
 * @param cine Datos del cine que se procesa.
 */
export async function upsertCinema(
    client: PoolClient,
    cine: ScrapedCinema,
): Promise<string> {
    const comunaNormalizada = normalizarComuna(cine.comuna);
    const result = await client.query<{ id: string }>(
        `
        INSERT INTO cines (
            id, nombre, direccion, comuna, ciudad,
            cadena, origen_id, url, logo_url, latitud, longitud
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (cadena, origen_id) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            direccion = EXCLUDED.direccion,
            comuna = EXCLUDED.comuna,
            ciudad = EXCLUDED.ciudad,
            url = EXCLUDED.url,
            logo_url = EXCLUDED.logo_url,
            latitud = EXCLUDED.latitud,
            longitud = EXCLUDED.longitud
        RETURNING id;
        `,
        [
            cine.id,
            cine.nombre,
            cine.direccion,
            comunaNormalizada,
            cine.ciudad,
            cine.origen,
            cine.origenId,
            cine.url,
            cine.logo,
            cine.latitud ?? null,
            cine.longitud ?? null,
        ],
    );

    const [row] = result.rows;
    if (!row) throw new Error(`La importación del cine ${cine.id} no devolvió un ID.`);
    return row.id;
}

import type { PoolClient } from "pg";
import type { ScrapedCinema } from "../types.ts";

export async function upsertCinema(
    client: PoolClient,
    cine: ScrapedCinema,
): Promise<string> {
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
            cine.comuna,
            cine.ciudad,
            cine.origen,
            cine.origenId,
            cine.url,
            cine.logo,
            cine.latitud ?? null,
            cine.longitud ?? null,
        ],
    );

    return result.rows[0].id;
}

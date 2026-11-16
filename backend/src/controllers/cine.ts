import { query, isCineId } from "../db.ts";
import express from "express";

const router = express.Router();

interface CineRow {
    id: string;
    nombre: string;
    comuna: string;
    ciudad: string | null;
    direccion: string;
    url: string | null;
    latitud: number | null;
    longitud: number | null;
    logo: string | null;
    origen: string;
}

const CINE_COLUMNS = `
    id,
    nombre,
    comuna,
    ciudad,
    direccion,
    url,
    latitud,
    longitud,
    logo_url AS logo,
    cadena AS origen
`;

function serializarCine(row: CineRow) {
    return {
        id: row.id,
        nombre: row.nombre,
        comuna: row.comuna,
        direccion: row.direccion,
        origen: row.origen,
        ...(row.ciudad ? { ciudad: row.ciudad } : {}),
        ...(row.url ? { url: row.url } : {}),
        ...(row.logo ? { logo: row.logo } : {}),
        ...(row.latitud !== null ? { latitud: row.latitud } : {}),
        ...(row.longitud !== null ? { longitud: row.longitud } : {}),
    };
}

router.get("/", async (req, res) => {
    const { cadena, comuna } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (cadena && typeof cadena === "string") {
        params.push(cadena);
        conditions.push(`cadena = $${params.length}`);
    }

    if (comuna && typeof comuna === "string") {
        params.push(comuna);
        conditions.push(`comuna = $${params.length}`);
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
        SELECT ${CINE_COLUMNS}
        FROM cines
        ${whereClause}
        ORDER BY nombre ASC;
    `;

    const { rows } = await query<CineRow>(sql, params);
    return res.json(rows.map(serializarCine));
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (!isCineId(id)) {
        return res.status(400).json({ error: "ID de cine invalido" });
    }

    const sql = `
        SELECT ${CINE_COLUMNS}
        FROM cines
        WHERE id = $1;
    `;

    const { rows } = await query<CineRow>(sql, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: "Cine no encontrado" });
    }
    return res.json(serializarCine(rows[0]!));
});

export default router;

import { query, isCineId } from "../db.ts";
import { normalizarComuna } from "../utils/comunas.ts";
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
    if (
        (cadena !== undefined &&
            (typeof cadena !== "string" || !cadena.trim() || cadena.length > 50)) ||
        (comuna !== undefined &&
            (typeof comuna !== "string" || !comuna.trim() || comuna.length > 100))
    ) {
        return res.status(400).json({ error: "Los filtros de cadena o comuna son inválidos" });
    }

    const conditions: string[] = [];
    const params: string[] = [];

    if (typeof cadena === "string") {
        params.push(cadena.trim().toLowerCase());
        conditions.push(`cadena = $${params.length}`);
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
    const cines = rows.map((row) => ({
        ...serializarCine(row),
        comuna: normalizarComuna(row.comuna),
    }));
    const comunaNormalizada = typeof comuna === "string"
        ? normalizarComuna(comuna)
        : undefined;
    return res.json(comunaNormalizada
        ? cines.filter((cine) => cine.comuna === comunaNormalizada)
        : cines);
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
    return res.json({
        ...serializarCine(rows[0]!),
        comuna: normalizarComuna(rows[0]!.comuna),
    });
});

export default router;

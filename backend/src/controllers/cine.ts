import { query, isCineId } from "../db.ts";
import express from "express";
import { normalizarComuna } from "../utils/comunas.ts";

const router = express.Router();

const CINE_COLUMNS = `
    id,
    nombre,
    comuna,
    ciudad,
    direccion,
    latitud,
    longitud,
    logo_url AS logo,
    cadena AS origen
    `;

router.get("/", async (req, res, next) => {
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

    const { rows } = await query(sql, params);
    const cines = rows.map((cine) => ({ ...cine, comuna: normalizarComuna(cine.comuna) }));
    const comunaNormalizada = typeof comuna === "string"
        ? normalizarComuna(comuna)
        : undefined;
    return res.json(comunaNormalizada
        ? cines.filter((cine) => cine.comuna === comunaNormalizada)
        : cines);
});

router.get("/:id", async (req, res, next) => {
    const { id } = req.params;

    if (!isCineId(id)) {
        return res.status(400).json({ error: "ID de cine invalido" });
    }

    //Aca $1 accede al id que se le ingresa en rows mediante un arreglo: [id]
    const sql = `
        SELECT ${CINE_COLUMNS}
        FROM cines
        WHERE id = $1;
        `;

    const { rows } = await query(sql, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: "Cine no encontrado" });
    }
    return res.json({ ...rows[0], comuna: normalizarComuna(rows[0].comuna) });
});

export default router;

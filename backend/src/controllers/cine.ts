import { query, isSourceId } from "../db.ts";
import express from "express";

const router = express.Router();

router.get("/", async (req, res, next) => {
    const { cadena, comuna } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (cadena && typeof cadena === "string") {
        params.push(cadena);
        conditions.push(`cadena = $${params.length}`);
    }

    if (comuna && typeof comuna === "string") {
        params.push(comuna);
        conditions.push(`comuna = $${params.length}`);
    }

    // Esto obliga a que la cadena/comuna tengan longitudes coincidentes
    // con lo que se intreso (i.e si comuna.len = 3, checkea que realmente sea asi)
    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
        SELECT
        id,
        nombre,
        cadena,
        comuna,
        direccion,
        latitud,
        longitud,
        origen,
        origen_id AS "origenId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
        FROM cines
        ${whereClause}
        ORDER BY nombre ASC;
        `;

    const { rows } = await query(sql, params);
    res.json(rows);
});

router.get("/:id", async (req, res, next) => {
    const { id } = req.params;

    if (!isSourceId(id)) {
        return res.status(400).json({ error: "ID de cine invalido" });
    }

    //Aca $1 accede al id que se le ingresa en rows mediante un arreglo: [id]
    const sql = `
        SELECT
        id,
        nombre,
        cadena,
        comuna,
        direccion,
        latitud,
        longitud,
        origen,
        origen_id AS "origenId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
        FROM cines
        WHERE id = $1;
        `;

    const { rows } = await query(sql, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: "Cine no encontrado" });
    }
    return res.json(rows[0]);
});

export default router;

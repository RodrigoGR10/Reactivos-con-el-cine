import express from "express";
import { query, isNumericId, isCineId } from "../db.ts";

const router = express.Router();

router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

router.get("/", async (req, res) => {
    const { peliculaId, cineId } = req.query;

    //Constr dinamica de filtros
    const conditions: string[] = [
        "(h.fecha + h.horario) >= (NOW() AT TIME ZONE 'America/Santiago')",
        "h.agotada = FALSE",
    ];

    const params: unknown[] = [];

    if (peliculaId !== undefined) {
        if (typeof peliculaId !== "string" || !isNumericId(peliculaId)) {
            return res.status(400).json({ error: "peliculaId inválido" });
        }
        params.push(parseInt(peliculaId, 10));
        conditions.push(`h.pelicula_id = $${params.length}`);
    }

    if (cineId !== undefined) {
        if (typeof cineId !== "string" || !isCineId(cineId)) {
            return res.status(400).json({ error: "cineId inválido" });
        }
        params.push(cineId);
        conditions.push(`h.cine_id = $${params.length}`);
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
            SELECT
              h.id,
              (h.fecha + h.horario) AS "fechaHora",
              (SELECT MIN(precio) FROM tarifas WHERE horario_id = h.id) AS precio,
              h.sala,
              h.formato_resumen AS formato,
              h.agotada,
              p.id AS "peliculaId",
              p.titulo AS "peliculaTitulo",
              p.imagen_url AS "peliculaImagenUrl",
              c.id AS "cineId",
              c.nombre AS "cineNombre"
            FROM horarios h
            INNER JOIN peliculas p ON h.pelicula_id = p.id
            INNER JOIN cines c ON h.cine_id = c.id
            ${whereClause}
            ORDER BY (h.fecha + h.horario) ASC;
          `;

    const { rows } = await query(sql, params);
    return res.json(rows);
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (!isNumericId(id)) {
        return res.status(400).json({ error: "ID de funcion invalido" });
    }

    const sql = `
            SELECT
              h.id,
              (h.fecha + h.horario) AS "fechaHora",
              (SELECT MIN(precio) FROM tarifas WHERE horario_id = h.id) AS precio,
              h.sala,
              h.formato_resumen AS formato,
              h.agotada,
              p.id AS "peliculaId",
              p.titulo AS "peliculaTitulo",
              p.duracion AS "peliculaDuracion",
              p.clasificacion AS "peliculaClasificacion",
              p.imagen_url AS "peliculaImagenUrl",
              c.id AS "cineId",
              c.nombre AS "cineNombre",
              c.direccion AS "cineDireccion"
            FROM horarios h
            INNER JOIN peliculas p ON h.pelicula_id = p.id
            INNER JOIN cines c ON h.cine_id = c.id
            WHERE h.id = $1;
          `;

    const { rows } = await query(sql, [parseInt(id, 10)]);

    if (rows.length === 0) {
        return res.status(404).json({ error: "Funcion no encontrada" });
    }

    return res.json(rows[0]);
});

router.get("/horarios", async (req, res) => {
    const { peliculaId, cineId } = req.query;

    const conditions: string[] = [
        "(h.fecha + h.horario) >= (NOW() AT TIME ZONE 'America/Santiago')",
        "h.agotada = FALSE",
    ];

    const params: unknown[] = [];

    if (peliculaId !== undefined) {
        if (typeof peliculaId !== "string" || !isNumericId(peliculaId)) {
            return res.status(400).json({ error: "peliculaId inválido" });
        }
        params.push(parseInt(peliculaId, 10));
        conditions.push(`h.pelicula_id = $${params.length}`);
    }

    if (cineId !== undefined) {
        if (typeof cineId !== "string" || !isCineId(cineId)) {
            return res.status(400).json({ error: "cineId inválido" });
        }
        params.push(cineId);
        conditions.push(`h.cine_id = $${params.length}`);
    }

    // Validación: Al menos uno de los dos debe estar presente
    if (!params.length) {
        return res.status(400).json({ error: "Indica peliculaId o cineId" });
    }

    const sql = `
            SELECT
              h.id,
              (h.fecha + h.horario) AS "fechaHora",
              (SELECT MIN(precio) FROM tarifas WHERE horario_id = h.id) AS precio,
              h.sala,
              h.formato_resumen AS formato,
              h.agotada,
              p.id AS "peliculaId",
              p.titulo AS "peliculaTitulo",
              c.id AS "cineId",
              c.nombre AS "cineNombre"
            FROM horarios h
            INNER JOIN peliculas p ON h.pelicula_id = p.id
            INNER JOIN cines c ON h.cine_id = c.id
            WHERE ${conditions.join(" AND ")}
            ORDER BY (h.fecha + h.horario) ASC;
        `;

    const { rows } = await query(sql, params);
    return res.json(rows);
});

router.get("/precios", async (req, res) => {
    const { peliculaId, cineId, fecha } = req.query;

    // Validación de tipos y formato UUID/Fecha (YYYY-MM-DD)
    const isDate = (d: string) => !isNaN(Date.parse(d));

    if (
        typeof peliculaId !== "string" ||
        !isNumericId(peliculaId) ||
        typeof cineId !== "string" ||
        !isCineId(cineId) ||
        typeof fecha !== "string" ||
        !isDate(fecha)
    ) {
        return res.status(400).json({
            error: "Indica peliculaId, cineId y una fecha valida.",
        });
    }

    const sql = `
            SELECT
              h.id,
              (h.fecha + h.horario) AS "fechaHora",
              (SELECT MIN(precio) FROM tarifas WHERE horario_id = h.id) AS precio,
              h.sala,
              h.formato_resumen AS formato,
              h.agotada
            FROM horarios h
            WHERE h.pelicula_id = $1
              AND h.cine_id = $2
              AND h.fecha = $3
              AND (h.fecha + h.horario) >= (NOW() AT TIME ZONE 'America/Santiago')
            ORDER BY h.horario ASC;
        `;

    const { rows } = await query(sql, [peliculaId, cineId, fecha]);

    return res.json({
        horarios: rows,
        cacheMinutos: 15,
    });
});
export default router;

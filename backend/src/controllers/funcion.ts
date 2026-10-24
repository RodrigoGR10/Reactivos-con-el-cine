import express from "express";
import { query, isUuid } from "../db.ts";

const router = express.Router();

router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

router.get("/", async (req, res) => {
    const { peliculaId, cineId } = req.query;

    //Constr dinamica de filtros
    const conditions: string[] = [
        "f.fecha_hora >= CURRENT_TIMESTAMP",
        "f.agotada = FALSE",
    ];

    const params: unknown[] = [];

    if (peliculaId && typeof peliculaId === "string") {
        if (!isUuid(peliculaId)) {
            return res.status(400).json({ error: "peliculaId inválido" });
        }
        params.push(peliculaId);
        conditions.push(`f.pelicula_id = $${params.length}`);
    }

    if (cineId && typeof cineId === "string") {
        if (!isUuid(cineId)) {
            return res.status(400).json({ error: "cineId inválido" });
        }
        params.push(cineId);
        conditions.push(`f.cine_id = $${params.length}`);
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
        SELECT
          f.id,
          f.fecha_hora AS "fechaHora",
          f.precio,
          f.sala,
          f.formato,
          f.agotada,
          p.id AS "peliculaId",
          p.titulo AS "peliculaTitulo",
          p.imagen_url AS "peliculaImagenUrl",
          c.id AS "cineId",
          c.nombre AS "cineNombre"
        FROM funciones f
        INNER JOIN peliculas p ON f.pelicula_id = p.id
        INNER JOIN cines c ON f.cine_id = c.id
        ${whereClause}
        ORDER BY f.fecha_hora ASC;
      `;

    const { rows } = await query(sql, params);
    return res.json(rows);
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !isUuid(id)) {
        return res.status(400).json({ error: "ID de funcion invalido" });
    }
    const sql = `
        SELECT
          f.id,
          f.fecha_hora AS "fechaHora",
          f.precio,
          f.sala,
          f.formato,
          f.agotada,
          p.id AS "peliculaId",
          p.titulo AS "peliculaTitulo",
          p.duracion AS "peliculaDuracion",
          p.clasificacion AS "peliculaClasificacion",
          p.imagen_url AS "peliculaImagenUrl",
          c.id AS "cineId",
          c.nombre AS "cineNombre",
          c.direccion AS "cineDireccion"
        FROM funciones f
        INNER JOIN peliculas p ON f.pelicula_id = p.id
        INNER JOIN cines c ON f.cine_id = c.id
        WHERE f.id = $1;
      `;

    const { rows } = await query(sql, [id]);

    if (rows.length === 0) {
        res.status(404).json({ error: "Funcion no encontrada" });
    }

    return res.json(rows[0]);
});

router.get("/horarios", async (req, res) => {
    const { peliculaId, cineId } = req.query;

    const conditions: string[] = [
        "f.fecha_hora >= CURRENT_TIMESTAMP",
        "f.agotada = FALSE",
    ];
    const params: unknown[] = [];

    if (peliculaId !== undefined) {
        if (typeof peliculaId !== "string" || !isUuid(peliculaId)) {
            return res.status(400).json({ error: "peliculaId invalido" });
        }
        params.push(peliculaId);
        conditions.push(`f.pelicula_id = $${params.length}`);
    }

    if (cineId !== undefined) {
        if (typeof cineId !== "string" || !isUuid(cineId)) {
            return res.status(400).json({ error: "cineId invalido" });
        }
        params.push(cineId);
        conditions.push(`f.cine_id = $${params.length}`);
    }

    // Validación: Al menos uno de los dos debe estar presente
    if (!params.length) {
        return res.status(400).json({ error: "Indica peliculaId o cineId" });
    }

    const sql = `
    SELECT
      f.id,
      f.fecha_hora AS "fechaHora",
      f.precio,
      f.sala,
      f.formato,
      f.agotada,
      p.id AS "peliculaId",
      p.titulo AS "peliculaTitulo",
      c.id AS "cineId",
      c.nombre AS "cineNombre"
    FROM funciones f
    INNER JOIN peliculas p ON f.pelicula_id = p.id
    INNER JOIN cines c ON f.cine_id = c.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY f.fecha_hora ASC;
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
        !isUuid(peliculaId) ||
        typeof cineId !== "string" ||
        !isUuid(cineId) ||
        typeof fecha !== "string" ||
        !isDate(fecha)
    ) {
        return res.status(400).json({
            error: "Indica peliculaId, cineId y una fecha valida.",
        });
    }

    const sql = `
    SELECT
      f.id,
      f.fecha_hora AS "fechaHora",
      f.precio,
      f.sala,
      f.formato,
      f.agotada
    FROM funciones f
    WHERE f.pelicula_id = $1
      AND f.cine_id = $2
      AND DATE(f.fecha_hora) = $3
      AND f.fecha_hora >= CURRENT_TIMESTAMP
    ORDER BY f.fecha_hora ASC;
  `;

    const { rows } = await query(sql, [peliculaId, cineId, fecha]);

    return res.json({
        horarios: rows,
        cacheMinutos: 15,
    });
});
export default router;

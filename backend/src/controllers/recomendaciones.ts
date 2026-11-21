import express from "express";
import { isCineId, query } from "../db.ts";
import { isDate } from "../scraper/normalize.ts";

const router = express.Router();

router.get("/", async (req, res, next) => {
    const { fecha, hora, cineIds } = req.query;

    if (
        typeof fecha !== "string" ||
        !isDate(fecha) ||
        typeof hora !== "string" ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora) ||
        typeof cineIds !== "string"
    ) {
        return res
            .status(400)
            .json({ error: "Indica una fecha, hora y ubicación válidas." });
    }

    const ids = [...new Set(cineIds.split(",").filter(Boolean))];
    if (!ids.length || ids.length > 200 || ids.some((id) => !isCineId(id))) {
        return res
            .status(400)
            .json({ error: "Indica al menos un cine válido." });
    }

    try {
        const sql = `
            SELECT
              h.id,
              to_char(h.fecha + h.horario, 'YYYY-MM-DD"T"HH24:MI:SS') AS "fechaHora",
              p.id AS "peliculaId",
              p.titulo AS "peliculaTitulo",
              p.imagen_url AS "peliculaImagenUrl",
              c.id AS "cineId",
              c.nombre AS "cineNombre",
              h.formato_resumen AS "formato",
              h.idioma
            FROM horarios h
            INNER JOIN peliculas p ON h.pelicula_id = p.id
            INNER JOIN cines c ON h.cine_id = c.id
            WHERE h.agotada = FALSE
              AND h.cine_id = ANY($3::text[])
              AND h.fecha + h.horario >= $1::date + $2::time
              AND h.fecha + h.horario < ($1::date + $2::time + INTERVAL '3 hours')
              AND h.fecha + h.horario >= (NOW() AT TIME ZONE 'America/Santiago')
            ORDER BY h.fecha + h.horario ASC;
        `;

        const { rows } = await query(sql, [fecha, hora, ids]);
        return res.json(rows);
    } catch (error) {
        return next(error);
    }
});

export default router;

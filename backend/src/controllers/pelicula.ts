import express from "express";
import { query } from "../db.ts";

const router = express.Router();

// Alias para que la respuesta calce con la interfaz Pelicula del frontend.
// - fecha_estreno es DATE: to_char evita que pg lo convierta en un Date de JS
//   (que se serializaria con hora y zona) y entrega "YYYY-MM-DD".
// - estadoEstreno se deriva de la fecha de estreno, comparada contra el dia
//   actual en Chile.
const PELICULA_COLUMNS = `
    p.id,
    p.titulo,
    p.sinopsis,
    p.duracion,
    p.genero,
    p.clasificacion,
    p.imagen_url AS poster,
    p.banner,
    p.tmdb_id AS "tmdbId",
    (
        SELECT to_char(MIN(fecha_estreno), 'YYYY-MM-DD')
        FROM pelicula_fuentes pf
        WHERE pf.pelicula_id = p.id
    ) AS "fechaEstreno",
    (
        SELECT CASE
                WHEN MIN(fecha_estreno) > (NOW() AT TIME ZONE 'America/Santiago')::date
                THEN 'preventa'
                ELSE 'cartelera'
        END
        FROM pelicula_fuentes pf
        WHERE pf.pelicula_id = p.id
    ) AS "estadoEstreno"
    `;

router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

//Catalogo completo
router.get("/", async (req, res, next) => {
    const { cartelera } = req.query;

    if (
        cartelera !== undefined &&
        cartelera !== "true" &&
        cartelera !== "false"
    ) {
        return res
            .status(400)
            .json({ error: "cartelera debe ser true o false" });
    }

    if (cartelera !== "true") {
        const sql = `
            SELECT ${PELICULA_COLUMNS}
            FROM peliculas p
            ORDER BY p.titulo ASC;
            `;

        const { rows } = await query(sql);
        return res.json(rows);
    }

    //Si cartelera === true entonces hacemos joins, deduplicacion y filtrado de horarios vigentes
    const sql = `
        SELECT ${PELICULA_COLUMNS}
        FROM peliculas p
        INNER JOIN horarios_vigentes h ON h.pelicula_id = p.id
        WHERE h.agotada = FALSE
        GROUP BY p.id
        ORDER BY p.titulo ASC;
        `;

    const { rows } = await query(sql);
    return res.json(rows);
});

router.get("/:id", async (req, res, next) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "ID de película inválido" });
    }

    const sql = `
        SELECT ${PELICULA_COLUMNS}
        FROM peliculas p
        WHERE p.id = $1;
        `;

    const { rows } = await query(sql, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: "Película no encontrada" });
    }

    return res.json(rows[0]);
});

export default router;

import express from "express";
import { query, isSourceId } from "../db.ts";

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
    to_char(p.fecha_estreno, 'YYYY-MM-DD') AS "fechaEstreno",
    CASE
        WHEN p.fecha_estreno > (NOW() AT TIME ZONE 'America/Santiago')::date
        THEN 'preventa'
        ELSE 'cartelera'
    END AS "estadoEstreno"
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
            FROM peliculas
            ORDER BY titulo ASC;
            `;

        const { rows } = await query(sql);
        return res.json(rows);
    }

    //Si cartelera === true entonces hacemos joins, deduplicacion y filtrado de horarios vigentes
    const sql = `
        SELECT ${PELICULA_COLUMNS}
        FROM peliculas p
        INNER JOIN funciones f ON f.pelicula_id = p.id
        WHERE f.fecha_hora >= CURRENT_TIMESTAMP
          AND f.agotada = FALSE
        GROUP BY p.id
        ORDER BY p.titulo ASC;
        `;

    const { rows } = await query(sql);
    return res.json(rows);
});

router.get("/:id", async (req, res, next) => {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !isSourceId(id)) {
        return res.status(400).json({ error: "ID de película inválido" });
    }

    const sql = `
        SELECT ${PELICULA_COLUMNS}
        FROM peliculas
        WHERE id = $1;
        `;

    const { rows } = await query(sql, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: "Película no encontrada" });
    }

    return res.json(rows[0]);
});

export default router;

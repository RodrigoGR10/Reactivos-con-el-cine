import express from "express";
import middleware from "../utils/middleware.ts";
import { query, isUuid, isNumericId, isCineId } from "../db.ts";

const router = express.Router();

router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

router.get("/favoritos", middleware.withUser, async (req, res) => {
    const userId = req.userId;
    if (!userId || !isUuid(userId)) {
        return res
            .status(401)
            .json({ error: "El usuario de la sesión no existe" });
    }

    //Verificar la existencia del usuario (por si acaso)
    const checkUser = await query("SELECT id FROM users WHERE id = $1;", [
        userId,
    ]);

    if (checkUser.rows.length === 0) {
        return res
            .status(401)
            .json({ error: "El usuario de la sesion no existe" });
    }

    // Consultar arreglos de ids desde las tablas relacionales
    const sql = `
            SELECT
                COALESCE(
                    (SELECT ARRAY_AGG(pelicula_id) FROM favoritos_peliculas WHERE user_id = $1),
                    '{}'
                ) AS "peliculasFavoritas",
                COALESCE(
                    (SELECT ARRAY_AGG(cine_id) FROM favoritos_cines WHERE user_id = $1),
                    '{}'
                ) AS "cinesFavoritos";
        `;
    const { rows } = await query(sql, [userId]);
    return res.json(rows[0]);
});

router.post(
    "/favoritos/peliculas/:movieId",
    middleware.withUser,
    async (req, res) => {
        const userId = req.userId;
        const { movieId } = req.params;

        if (!userId || !isUuid(userId)) {
            return res
                .status(401)
                .json({ error: "El usuario de la sesión no existe" });
        }

        if (typeof movieId !== "string" || !isNumericId(movieId)) {
            return res.status(400).json({ error: "ID de película inválido" });
        }

        const parsedMovieId = parseInt(movieId, 10);

        const userCheck = await query("SELECT id FROM users WHERE id = $1;", [
            userId,
        ]);

        if (userCheck.rows.length === 0) {
            return res
                .status(401)
                .json({ error: "El usuario de la sesión no existe" });
        }

        const favCheck = await query(
            "SELECT 1 FROM favoritos_peliculas WHERE user_id = $1 AND pelicula_id = $2;",
            [userId, movieId],
        );

        if (favCheck.rows.length > 0) {
            //Si existe, se elimina
            await query(
                "DELETE FROM favoritos_peliculas WHERE user_id = $1 AND pelicula_id = $2;",
                [userId, parsedMovieId],
            );
        } else {
            //no existe, verificar que la peli exista en la BDD
            const movieCheck = await query(
                "SELECT id FROM peliculas WHERE id = $1;",
                [parsedMovieId],
            );
            if (movieCheck.rows.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Película no encontrada" });
            }

            //insertar en favs
            await query(
                "INSERT INTO favoritos_peliculas (user_id, pelicula_id) VALUES ($1, $2);",
                [userId, parsedMovieId],
            );
        }

        //Obtener lista actualizada de ids
        const updatedSql = `
            SELECT COALESCE(ARRAY_AGG(pelicula_id),'{}') AS "peliculasFavoritas"
            FROM favoritos_peliculas
            WHERE user_id = $1;
            `;

        const { rows } = await query(updatedSql, [userId]);

        return res.json({ peliculasFavoritas: rows[0].peliculasFavoritas });
    },
);

router.post(
    "/favoritos/cines/:cinemaId",
    middleware.withUser,
    async (req, res) => {
        const userId = req.userId;
        const { cinemaId } = req.params;

        if (!userId || !isUuid(userId)) {
            return res
                .status(401)
                .json({ error: "El usuario de la sesión no existe" });
        }

        if (!isCineId(cinemaId)) {
            return res.status(400).json({ error: "ID de cine inválido" });
        }

        const userCheck = await query("SELECT id FROM users WHERE id = $1;", [
            userId,
        ]);

        if (userCheck.rows.length === 0) {
            return res
                .status(401)
                .json({ error: "El usuario de la sesión no existe" });
        }

        const favCheck = await query(
            "SELECT 1 FROM favoritos_cines WHERE user_id = $1 AND cine_id = $2;",
            [userId, cinemaId],
        );

        if (favCheck.rows.length > 0) {
            //Si existe, se elimina
            await query(
                "DELETE FROM favoritos_cines WHERE user_id = $1 AND cine_id = $2;",
                [userId, cinemaId],
            );
        } else {
            //no existe, verificar que la peli exista en la BDD
            const cinemaCheck = await query(
                "SELECT id FROM cines WHERE id = $1;",
                [cinemaId],
            );
            if (cinemaCheck.rows.length === 0) {
                return res.status(404).json({ error: "Cine no encontrado" });
            }

            //insertar en favs
            await query(
                "INSERT INTO favoritos_cines (user_id, cine_id) VALUES ($1, $2);",
                [userId, cinemaId],
            );
        }
        //Obtener lista actualizada de ids
        const updatedSql = `
            SELECT COALESCE(ARRAY_AGG(cine_id),'{}') AS "cinesFavoritos"
            FROM favoritos_cines
            WHERE user_id = $1;
            `;

        const { rows } = await query(updatedSql, [userId]);

        return res.json({ cinesFavoritos: rows[0].cinesFavoritos });
    },
);

export default router;

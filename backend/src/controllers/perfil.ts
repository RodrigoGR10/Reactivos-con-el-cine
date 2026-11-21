import express from "express";
import middleware from "../utils/middleware.ts";
import { pool, query, isUuid, isNumericId, isCineId } from "../db.ts";

const router = express.Router();

// El bloqueo del usuario serializa las alternancias simultaneas sin perder favoritos.
async function alternarFavorito(
    userId: string,
    tipo: "peliculas" | "cines",
    id: string | number,
) {
    const tabla =
        tipo === "peliculas" ? "favoritos_peliculas" : "favoritos_cines";
    const columna = tipo === "peliculas" ? "pelicula_id" : "cine_id";
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const usuario = await client.query(
            "SELECT id FROM users WHERE id = $1 FOR UPDATE;",
            [userId],
        );
        if (!usuario.rowCount) {
            await client.query("ROLLBACK");
            return {
                status: 401,
                error: "El usuario de la sesión no existe",
            } as const;
        }
        const favorito = await client.query(
            `SELECT 1 FROM ${tabla} WHERE user_id = $1 AND ${columna} = $2;`,
            [userId, id],
        );
        if (favorito.rowCount) {
            await client.query(
                `DELETE FROM ${tabla} WHERE user_id = $1 AND ${columna} = $2;`,
                [userId, id],
            );
        } else {
            const recurso = await client.query(
                `SELECT id FROM ${tipo} WHERE id = $1;`,
                [id],
            );
            if (!recurso.rowCount) {
                await client.query("ROLLBACK");
                return {
                    status: 404,
                    error:
                        tipo === "peliculas"
                            ? "Película no encontrada"
                            : "Cine no encontrado",
                } as const;
            }
            await client.query(
                `INSERT INTO ${tabla} (user_id, ${columna}) VALUES ($1, $2);`,
                [userId, id],
            );
        }
        const { rows } = await client.query<{ id: string | number }>(
            `SELECT ${columna} AS id FROM ${tabla} WHERE user_id = $1 ORDER BY agregado_en, ${columna};`,
            [userId],
        );
        await client.query("COMMIT");
        return { ids: rows.map((row) => String(row.id)) };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

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
    const usuario = await query("SELECT id FROM users WHERE id = $1;", [
        userId,
    ]);
    if (!usuario.rowCount) {
        return res
            .status(401)
            .json({ error: "El usuario de la sesión no existe" });
    }
    const { rows } = await query(
        `
        SELECT
            COALESCE((SELECT ARRAY_AGG(pelicula_id::text ORDER BY agregado_en, pelicula_id)
                FROM favoritos_peliculas WHERE user_id = $1), '{}') AS "peliculasFavoritas",
            COALESCE((SELECT ARRAY_AGG(cine_id ORDER BY agregado_en, cine_id)
                FROM favoritos_cines WHERE user_id = $1), '{}') AS "cinesFavoritos";
    `,
        [userId],
    );
    return res.json(rows[0]);
});

router.post(
    "/favoritos/peliculas/:movieId",
    middleware.withUser,
    async (req, res) => {
        const userId = req.userId;
        if (!userId || !isUuid(userId)) {
            return res
                .status(401)
                .json({ error: "El usuario de la sesión no existe" });
        }
        if (
            typeof req.params.movieId !== "string" ||
            !isNumericId(req.params.movieId)
        ) {
            return res.status(400).json({ error: "ID de película inválido" });
        }
        const resultado = await alternarFavorito(
            userId,
            "peliculas",
            Number(req.params.movieId),
        );
        if ("error" in resultado)
            return res
                .status(resultado.status)
                .json({ error: resultado.error });
        return res.json({ peliculasFavoritas: resultado.ids });
    },
);

router.post(
    "/favoritos/cines/:cinemaId",
    middleware.withUser,
    async (req, res) => {
        const userId = req.userId;
        if (!userId || !isUuid(userId)) {
            return res
                .status(401)
                .json({ error: "El usuario de la sesión no existe" });
        }
        if (!isCineId(req.params.cinemaId)) {
            return res.status(400).json({ error: "ID de cine inválido" });
        }
        const resultado = await alternarFavorito(
            userId,
            "cines",
            req.params.cinemaId,
        );
        if ("error" in resultado)
            return res
                .status(resultado.status)
                .json({ error: resultado.error });
        return res.json({ cinesFavoritos: resultado.ids });
    },
);

export default router;

import express from "express";
import { isNumericId } from "../db.ts";
import {
    listarPeliculas,
    obtenerPelicula,
} from "../services/peliculas/consulta.ts";

const router = express.Router();

router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

router.get("/", async (req, res) => {
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

    const peliculas = await listarPeliculas(cartelera === "true");
    return res.json(peliculas);
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (typeof id !== "string" || !isNumericId(id)) {
        return res.status(400).json({ error: "ID de película inválido" });
    }

    const pelicula = await obtenerPelicula(parseInt(id, 10));

    if (pelicula === null) {
        return res.status(404).json({ error: "Película no encontrada" });
    }

    return res.json(pelicula);
});

export default router;

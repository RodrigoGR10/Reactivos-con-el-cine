import PeliculaModel from "../models/pelicula.ts";
import logger from "../utils/logger.ts";
import express from "express";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const peliculas = await PeliculaModel.find({});

  res.json(peliculas);
});

router.get("/:id", async (req, res, next) => {
  const pelicula = await PeliculaModel.findById(req.params.id);

  if (!pelicula) {
    res.status(404).json({ error: "Pelicula no encontrada" });
  }
  res.json(pelicula);
});

export default router;

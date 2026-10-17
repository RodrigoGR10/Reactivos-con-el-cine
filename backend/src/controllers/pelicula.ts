import PeliculaModel from "../models/pelicula.ts";
import HorarioModel from "../models/horario.ts";
import { horariosVigentes } from "../services/preciosFunciones.ts";
import express from "express";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const { cartelera } = req.query;
  if (cartelera !== undefined && cartelera !== "true" && cartelera !== "false") {
    res.status(400).json({ error: "cartelera debe ser true o false" });
    return;
  }
  if (cartelera === "true") {
    const ids = await HorarioModel.distinct("peliculaId", horariosVigentes());
    res.json(await PeliculaModel.find({ _id: { $in: ids } }));
    return;
  }
  const peliculas = await PeliculaModel.find({});

  res.json(peliculas);
});

router.get("/:id", async (req, res, next) => {
  const pelicula = await PeliculaModel.findById(req.params.id);

  if (!pelicula) {
    return res.status(404).json({ error: "Pelicula no encontrada" });
  }
  return res.json(pelicula);
});

export default router;

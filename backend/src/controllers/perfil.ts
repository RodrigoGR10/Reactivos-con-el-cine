import express from "express";
import mongoose from "mongoose";
import UserModel from "../models/user.ts";
import PeliculaModel from "../models/pelicula.ts";
import CineModel from "../models/cine.ts";
import middleware from "../utils/middleware.ts";

const router = express.Router();

router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/favoritos", middleware.withUser, async (req, res) => {
  const user = await UserModel.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: "El usuario de la sesión no existe" });
  }

  return res.json({
    peliculasFavoritas: user.peliculasFavoritas ?? [],
    cinesFavoritos: user.cinesFavoritos ?? [],
  });
});

router.post(
  "/favoritos/peliculas/:movieId",
  middleware.withUser,
  async (req, res) => {
    const { movieId } = req.params;
    if (typeof movieId !== "string" || !mongoose.isValidObjectId(movieId)) {
      return res.status(400).json({ error: "ID de película inválido" });
    }
    const peliculaId = movieId.toLowerCase();

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "El usuario de la sesión no existe" });
    }

    const actuales = user.peliculasFavoritas ?? [];
    const existe = actuales.includes(peliculaId);

    if (!existe) {
      const pelicula = await PeliculaModel.findById(peliculaId);
      if (!pelicula) {
        return res.status(404).json({ error: "Película no encontrada" });
      }
    }

    user.peliculasFavoritas = existe
      ? actuales.filter((id) => id !== peliculaId)
      : [...actuales, peliculaId];

    await user.save();

    return res.json({ peliculasFavoritas: user.peliculasFavoritas });
  },
);

router.post(
  "/favoritos/cines/:cinemaId",
  middleware.withUser,
  async (req, res) => {
    const { cinemaId } = req.params;
    if (typeof cinemaId !== "string" || !mongoose.isValidObjectId(cinemaId)) {
      return res.status(400).json({ error: "ID de cine inválido" });
    }
    const cineId = cinemaId.toLowerCase();

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "El usuario de la sesión no existe" });
    }

    const actuales = user.cinesFavoritos ?? [];
    const existe = actuales.includes(cineId);

    if (!existe) {
      const cine = await CineModel.findById(cineId);
      if (!cine) {
        return res.status(404).json({ error: "Cine no encontrado" });
      }
    }

    user.cinesFavoritos = existe
      ? actuales.filter((id) => id !== cineId)
      : [...actuales, cineId];

    await user.save();

    return res.json({ cinesFavoritos: user.cinesFavoritos });
  },
);

export default router;

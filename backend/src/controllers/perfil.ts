import express from "express";
import mongoose from "mongoose";
import UserModel from "../models/user.ts";
import PeliculaModel from "../models/pelicula.ts";
import CineModel from "../models/cine.ts";
import middleware from "../utils/middleware.ts";

const router = express.Router();

function alternarFavorito(userId: string, campo: "peliculasFavoritas" | "cinesFavoritos", recursoId: string) {
  const actuales = { $ifNull: [`$${campo}`, []] };
  // La alternancia usa el estado actual de MongoDB, no una copia leida antes de otra peticion.
  return UserModel.findByIdAndUpdate(userId, [{
    $set: {
      [campo]: {
        $cond: [
          { $in: [recursoId, actuales] },
          { $filter: { input: actuales, as: "favorito", cond: { $ne: ["$$favorito", recursoId] } } },
          { $concatArrays: [actuales, [recursoId]] },
        ],
      },
    },
  }], { returnDocument: "after", updatePipeline: true });
}

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

    const actualizado = await alternarFavorito(user._id.toString(), "peliculasFavoritas", peliculaId);
    if (!actualizado) {
      return res.status(401).json({ error: "El usuario de la sesión no existe" });
    }
    return res.json({ peliculasFavoritas: actualizado.peliculasFavoritas });
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

    const actualizado = await alternarFavorito(user._id.toString(), "cinesFavoritos", cineId);
    if (!actualizado) {
      return res.status(401).json({ error: "El usuario de la sesión no existe" });
    }
    return res.json({ cinesFavoritos: actualizado.cinesFavoritos });
  },
);

export default router;

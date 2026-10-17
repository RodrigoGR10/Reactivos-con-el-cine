import express from "express";
import UserModel from "../models/user.ts";
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
    if (typeof movieId !== "string" || !movieId.trim()) {
      return res.status(400).json({ error: "ID de película inválido" });
    }

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "El usuario de la sesión no existe" });
    }

    const actuales = user.peliculasFavoritas ?? [];
    const existe = actuales.includes(movieId);

    user.peliculasFavoritas = existe
      ? actuales.filter((id) => id !== movieId)
      : [...actuales, movieId];

    await user.save();

    return res.json({ peliculasFavoritas: user.peliculasFavoritas });
  },
);

router.post(
  "/favoritos/cines/:cinemaId",
  middleware.withUser,
  async (req, res) => {
    const { cinemaId } = req.params;
    if (typeof cinemaId !== "string" || !cinemaId.trim()) {
      return res.status(400).json({ error: "ID de cine inválido" });
    }

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "El usuario de la sesión no existe" });
    }

    const actuales = user.cinesFavoritos ?? [];
    const existe = actuales.includes(cinemaId);

    user.cinesFavoritos = existe
      ? actuales.filter((id) => id !== cinemaId)
      : [...actuales, cinemaId];

    await user.save();

    return res.json({ cinesFavoritos: user.cinesFavoritos });
  },
);

export default router;

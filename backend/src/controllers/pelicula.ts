import PeliculaModel from "../models/pelicula.ts";
import logger from "../utils/logger.ts";
import express from "express";

const router = express.Router();

router.get("/", (request, response, next) => {
  PeliculaModel.find({})
    .then((peliculas) => {
      response.json(peliculas);
    })
    .catch((error) => next(error));
});

router.get("/:id", (request, response, next) => {
  const id = request.params.id;
  const pelicula = PeliculaModel.findById(id);

  Promise.all([pelicula])
    .then(([peliculaEncontrada]) => {
      if (peliculaEncontrada) {
        response.json(peliculaEncontrada);
      } else {
        response.status(404).json({ error: "Pelicula no encontrada" });
      }
    })
    .catch((error) => next(error));
});

export default router;

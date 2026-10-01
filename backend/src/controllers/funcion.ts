import FuncionModel from "../models/funcion.ts";
import logger from "../utils/logger.ts";
import express from "express";

const router = express.Router();

router.get("/", (request, response, next) => {
  const { peliculaId } = request.query;

  //si pasan una peli por query, filtramos - si no, traemos todas
  const filtro = peliculaId ? { pelicula: peliculaId } : {};

  FuncionModel.find(filtro)
    .then((funciones) => {
      response.json(funciones);
    })
    .catch((error) => next(error));
});

router.get("/:id", (request, response, next) => {
  const id = request.params.id;

  FuncionModel.findById(id)
    .then((funcion) => {
      if (funcion) {
        response.json(funcion);
      } else {
        response.status(404).json({ error: "Funcion no encontrada" });
      }
    })
    .catch((error) => next(error));
});

export default router;

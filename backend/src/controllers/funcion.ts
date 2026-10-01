import FuncionModel from "../models/funcion.ts";
import logger from "../utils/logger.ts";
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", (request, response, next) => {
  const { peliculaId } = request.query;

  // Sin filtro: traemos todas las funciones
  if (peliculaId === undefined) {
    FuncionModel.find({})
      .then((funciones) => response.json(funciones))
      .catch((error) => next(error));
    return;
  }

  // Con filtro: debe ser un string con formato de ObjectId válido
  if (typeof peliculaId !== "string" || !mongoose.isValidObjectId(peliculaId)) {
    response.status(400).json({ error: "peliculaId inválido" });
    return;
  }

  FuncionModel.find({ peliculaId })
    .then((funciones) => response.json(funciones))
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

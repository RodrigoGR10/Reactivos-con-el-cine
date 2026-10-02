import FuncionModel from "../models/funcion.ts";
import logger from "../utils/logger.ts";
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const { peliculaId } = req.query;

  // Sin filtro: traemos todas las funciones
  if (peliculaId === undefined) {
    const funciones = await FuncionModel.find({});
    res.json(funciones);
    return;
  }

  // Con filtro: debe ser un string con formato de ObjectId válido
  if (typeof peliculaId !== "string" || !mongoose.isValidObjectId(peliculaId)) {
    res.status(400).json({ error: "peliculaId inválido" });
    return;
  }

  const funcionesFiltradas = await FuncionModel.find({ peliculaId });
  res.json(funcionesFiltradas);
});

router.get("/:id", async (req, res, next) => {
  const funcion = await FuncionModel.findById(req.params.id);

  if (funcion) {
    res.json(funcion);
  } else {
    res.status(404).json({ error: "Funcion no encontrada" });
  }
});

export default router;

import FuncionModel from "../models/funcion.ts";
import logger from "../utils/logger.ts";
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const { peliculaId, cineId } = req.query;

  const filtro: Record<string, string> = {};

  if (peliculaId !== undefined) {
    if (typeof peliculaId !== "string" || !mongoose.isValidObjectId(peliculaId)) {
      res.status(400).json({ error: "peliculaId inválido" });
      return;
    }
    filtro.peliculaId = peliculaId;
  }

  if (cineId !== undefined) {
    if (typeof cineId !== "string" || !mongoose.isValidObjectId(cineId)) {
      res.status(400).json({ error: "cineId inválido" });
      return;
    }
    filtro.cineId = cineId;
  }

  const funciones = await FuncionModel.find(filtro);
  res.json(funciones);
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

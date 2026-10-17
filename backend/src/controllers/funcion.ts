import FuncionModel from "../models/funcion.ts";
import HorarioModel from "../models/horario.ts";
import { horarioPublico, horariosVigentes, preciosPorCine } from "../services/preciosFunciones.ts";
import { isDate } from "../scraper/normalize.ts";
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/horarios", async (req, res) => {
  const { peliculaId } = req.query;
  if (typeof peliculaId !== "string" || !mongoose.isValidObjectId(peliculaId)) {
    res.status(400).json({ error: "peliculaId invalido" });
    return;
  }
  const horarios = await HorarioModel.find({ peliculaId, ...horariosVigentes() }).sort({ fecha: 1, horario: 1 }).lean();
  res.set("Cache-Control", "no-store").json(horarios.map(horarioPublico));
});

router.get("/precios", async (req, res) => {
  const { peliculaId, cineId, fecha } = req.query;
  if (typeof peliculaId !== "string" || !mongoose.isValidObjectId(peliculaId) || typeof cineId !== "string" || !mongoose.isValidObjectId(cineId) || typeof fecha !== "string" || !isDate(fecha)) {
    res.status(400).json({ error: "Indica peliculaId, cineId y una fecha valida." });
    return;
  }
  const horarios = await preciosPorCine(peliculaId, cineId, fecha);
  res.set("Cache-Control", "no-store").json({ horarios, cacheMinutos: 15 });
});

router.get("/", async (req, res, next) => {
  const { peliculaId } = req.query;

  // Sin filtro: traemos todas las funciones
  if (peliculaId === undefined) {
    const funciones = await FuncionModel.find(horariosVigentes());
    res.json(funciones);
    return;
  }

  // Con filtro: debe ser un string con formato de ObjectId válido
  if (typeof peliculaId !== "string" || !mongoose.isValidObjectId(peliculaId)) {
    res.status(400).json({ error: "peliculaId inválido" });
    return;
  }

  const funcionesFiltradas = await FuncionModel.find({ peliculaId, ...horariosVigentes() });
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

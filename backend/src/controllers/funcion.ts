import HorarioModel from "../models/horario.ts";
import { horarioPublico, horariosVigentes, preciosPorCine } from "../services/preciosFunciones.ts";
import { isDate } from "../scraper/normalize.ts";
import express from "express";
import mongoose from "mongoose";
import { butacasPorCine } from "../services/butacasFunciones.ts";

const router = express.Router();

router.get("/horarios", async (req, res) => {
  const { peliculaId, cineId } = req.query;
  const filtro: Record<string, string> = {};

  if (peliculaId !== undefined) {
    if (typeof peliculaId !== "string" || !mongoose.isValidObjectId(peliculaId)) {
      res.status(400).json({ error: "peliculaId invalido" });
      return;
    }
    filtro.peliculaId = peliculaId;
  }

  if (cineId !== undefined) {
    if (typeof cineId !== "string" || !mongoose.isValidObjectId(cineId)) {
      res.status(400).json({ error: "cineId invalido" });
      return;
    }
    filtro.cineId = cineId;
  }

  if (!filtro.peliculaId && !filtro.cineId) {
    res.status(400).json({ error: "Indica peliculaId o cineId" });
    return;
  }

  const horarios = await HorarioModel.find({ ...filtro, ...horariosVigentes() }).sort({ fecha: 1, horario: 1 }).lean();
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

router.get("/butacas", async (req, res) => {
  const { peliculaId, cineId, fecha } = req.query;
  if (typeof peliculaId !== "string" || !mongoose.isValidObjectId(peliculaId) || typeof cineId !== "string" || !mongoose.isValidObjectId(cineId) || typeof fecha !== "string" || !isDate(fecha)) {
    res.status(400).json({ error: "Indica peliculaId, cineId y una fecha valida." });
    return;
  }
  const horarios = await butacasPorCine(peliculaId, cineId, fecha);
  res.set("Cache-Control", "no-store").json({ horarios: horarios.map(horarioPublico), cacheSegundos: 120 });
});

export default router;

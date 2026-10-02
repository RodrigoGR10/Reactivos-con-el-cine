import CineModel from "../models/cine.ts";
import logger from "../utils/logger.ts";
import express from "express";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const cines = await CineModel.find({});

  res.json(cines);
});

router.get("/:id", async (req, res, next) => {
  const cine = await CineModel.findById(req.params.id);

  if (!cine) {
    return res.status(404).json({ error: "Cine no encontrado" });
  }
  return res.json(cine);
});

export default router;

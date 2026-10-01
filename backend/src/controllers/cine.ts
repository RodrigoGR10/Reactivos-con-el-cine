import CineModel from "../models/cine.ts";
import logger from "../utils/logger.ts";
import express from "express";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const cines = await CineModel.find({});

  res.json(cines);
});

export default router;

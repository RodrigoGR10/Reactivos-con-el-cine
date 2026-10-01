import CineModel from "../models/cine.ts";
import logger from "../utils/logger.ts";
import express from "express";

const router = express.Router();

router.get("/", (request, response, next) => {
  CineModel.find({})
    .then((cines) => {
      response.json(cines);
    })
    .catch((error) => next(error));
});

export default router;

import { type NextFunction, type Request, type Response } from "express";
import logger from "./logger.ts";

const requestLogger = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  logger.info("Method:", request.method);
  logger.info("Path:  ", request.path);
  logger.info("Body:  ", request.body);
  logger.info("---");
  next();
};

const errorHandler = (
  error: { name: string; message: string },
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  logger.error(error.message);

  logger.error(error.name);
  if (error.name === "CastError") {
    response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    response.status(400).json({ error: error.message });
  }
  next(error);
};

const unknownEndpoint = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  response.status(404).send({ error: "unkown endpoint" });
};

export default { requestLogger, errorHandler, unknownEndpoint };

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
  error: { name: string; message: string; status?: number; type?: string },
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  if (response.headersSent) {
    return next(error);
  }

  logger.error(error.message);

  logger.error(error.name);
  if (error.name === "CastError") {
    return response.status(400).json({ error: "Identificador inválido" });
  } else if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  } else if (
    error.name === "MongoServerError" &&
    error.message.includes("E11000 duplicate key error")
  ) {
    return response.status(400).json({
      error: "Este correo electrónico ya se encuentra registrado.",
    });
  } else if (error.type === "entity.parse.failed") {
    return response.status(400).json({
      error: "El JSON de la solicitud es inválido",
    });
  } else if (
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return response.status(error.status).json({ error: "Solicitud inválida" });
  }

  return response.status(500).json({ error: "Error interno del servidor" });
};

const unknownEndpoint = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  response.status(404).json({ error: "Ruta no encontrada" });
};

export default { requestLogger, errorHandler, unknownEndpoint };

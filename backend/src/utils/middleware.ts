import { type NextFunction, type Request, type Response } from "express";
import logger from "./logger.ts";
import jwt from "jsonwebtoken";
import config from "./config.ts";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const withUser = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const token = request.cookies?.token;
  if (typeof token !== "string" || !token) {
    return response.status(401).json({ error: "No hay una sesión activa" });
  }

  const decodedToken = jwt.verify(token, config.JWT_SECRET, {
    algorithms: ["HS256"],
  });
  const csrfToken = request.headers["x-csrf-token"];

  if (
    typeof decodedToken !== "object" ||
    typeof decodedToken.id !== "string" ||
    typeof decodedToken.csrf !== "string" ||
    decodedToken.csrf !== csrfToken
  ) {
    return response.status(401).json({ error: "Sesión o token CSRF inválido" });
  }

  request.userId = decodedToken.id;
  next();
};

const requestLogger = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  logger.info("Method:", request.method);
  logger.info("Path:  ", request.path);
  logger.info("---");
  next();
};

const errorHandler = (
  error: { name: string; message: string; status?: number; type?: string; code?: number; keyPattern?: Record<string, unknown> },
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
  } else if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
    return response.status(401).json({ error: "Sesión inválida" });
  } else if (error.name === "TokenExpiredError") {
    return response.status(401).json({ error: "La sesión ha expirado" });
  } else if (
    error.code === 11000
  ) {
    const campos = Object.keys(error.keyPattern ?? {});
    return response.status(409).json({
      error: campos.length === 1 && campos[0] === "email"
        ? "Este correo electrónico ya se encuentra registrado."
        : "Ya existe un registro con esos datos.",
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

export default { requestLogger, errorHandler, unknownEndpoint, withUser };

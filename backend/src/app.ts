import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./utils/config.ts";
import middleware from "./utils/middleware.ts";
import peliculaRouter from "./controllers/pelicula.ts";
import funcionRouter from "./controllers/funcion.ts";
import cineRouter from "./controllers/cine.ts";
import authRouter from "./controllers/auth.ts";
import perfilRouter from "./controllers/perfil.ts";

const app = express();

app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    exposedHeaders: ["X-CSRF-Token"],
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use(express.static("dist"));
app.use(middleware.requestLogger);

app.use("/peliculas", peliculaRouter);
app.use("/funciones", funcionRouter);
app.use("/cines", cineRouter);
app.use("/auth", authRouter);
app.use("/perfil", perfilRouter);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export default app;

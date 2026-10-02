import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import middleware from "./utils/middleware.ts";
import peliculaRouter from "./controllers/pelicula.ts";
import funcionRouter from "./controllers/funcion.ts";
import cineRouter from "./controllers/cine.ts";
import authRouter from "./controllers/auth.ts";

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static("dist"));
app.use(middleware.requestLogger);

app.use("/peliculas", peliculaRouter);
app.use("/funciones", funcionRouter);
app.use("/cines", cineRouter);
app.use("/auth", authRouter);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export default app;

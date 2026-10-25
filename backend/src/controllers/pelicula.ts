import PeliculaModel from "../models/pelicula.ts";
import HorarioModel from "../models/horario.ts";
import { horariosVigentes } from "../services/preciosFunciones.ts";
import express from "express";
import { clasificarEstreno } from "../utils/estreno.ts";
import { localNow } from "../utils/localNow.ts";
import { incluirPopularidad } from "../services/popularidadPeliculas.ts";

const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.get("/", async (req, res, next) => {
  const { cartelera } = req.query;
  if (cartelera !== undefined && cartelera !== "true" && cartelera !== "false") {
    res.status(400).json({ error: "cartelera debe ser true o false" });
    return;
  }
  if (cartelera === "true") {
    const horarios = await HorarioModel.find({ ...horariosVigentes(), agotada: { $ne: true } })
      .select("peliculaId origen peliculaOrigenId").lean();
    const fuentesVigentes = new Map<string, Set<string>>();
    for (const horario of horarios) {
      const id = horario.peliculaId.toString();
      const fuentes = fuentesVigentes.get(id) ?? new Set<string>();
      fuentes.add(`${horario.origen}:${horario.peliculaOrigenId}`);
      fuentesVigentes.set(id, fuentes);
    }
    const peliculas = await PeliculaModel.find({ _id: { $in: [...fuentesVigentes.keys()] } });
    const hoy = localNow().slice(0, 10);
    const disponibles = peliculas.map((pelicula) => {
      const fuentes = (pelicula.fuentes ?? []).filter((fuente) =>
        fuentesVigentes.get(pelicula._id.toString())?.has(`${fuente.origen}:${fuente.origenId}`));
      return { ...pelicula.toJSON(), id: pelicula._id.toString(), ...clasificarEstreno(fuentes, hoy) };
    }).filter((pelicula) => pelicula.estadoEstreno !== "proximamente");
    res.json(await incluirPopularidad(disponibles));
    return;
  }
  const peliculas = await PeliculaModel.find({});

  res.json(await incluirPopularidad(peliculas.map((pelicula) => ({ ...pelicula.toJSON(), id: pelicula._id.toString() }))));
});

router.get("/:id", async (req, res, next) => {
  const pelicula = await PeliculaModel.findById(req.params.id);

  if (!pelicula) {
    return res.status(404).json({ error: "Pelicula no encontrada" });
  }
  const [publica] = await incluirPopularidad([{ ...pelicula.toJSON(), id: pelicula._id.toString() }]);
  return res.json(publica);
});

export default router;

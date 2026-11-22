import express from "express";
import { isNumericId, isCineId } from "../db.ts";
import { isDate } from "../scraper/normalize.ts";
import { butacasPorCine } from "../services/butacasFunciones.ts";
import {
    obtenerFuncion,
    listarFunciones,
} from "../services/funciones/consulta.ts";
import { preciosPorCine } from "../services/preciosFunciones.ts";
import { cargarHorarios } from "../services/preciosFunciones/horarios.ts";
import { horarioPublico } from "../services/preciosFunciones/estado.ts";

const router = express.Router();

/** Rutas de horarios, tarifas, butacas y detalle de funciones. */

router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

/** GET /api/funciones?peliculaId=.&cineId=. lista funciones filtradas. */
router.get("/", async (req, res) => {
    const { peliculaId, cineId } = req.query;

    let parsedPeliculaId: number | undefined;

    if (peliculaId !== undefined) {
        if (typeof peliculaId !== "string" || !isNumericId(peliculaId)) {
            return res.status(400).json({ error: "peliculaId inválido" });
        }
        parsedPeliculaId = parseInt(peliculaId, 10);
    }

    if (
        cineId !== undefined &&
        (typeof cineId !== "string" || !isCineId(cineId))
    ) {
        return res.status(400).json({ error: "cineId inválido" });
    }

    const funciones = await listarFunciones({
        peliculaId: parsedPeliculaId,
        cineId: typeof cineId === "string" ? cineId : undefined,
    });

    return res.json(funciones);
});

/** GET /api/funciones/horarios acepta `peliculaId` o `cineId`. */
router.get("/horarios", async (req, res) => {
    const { peliculaId, cineId } = req.query;

    let parsedPeliculaId: number | undefined;

    if (peliculaId !== undefined) {
        if (typeof peliculaId !== "string" || !isNumericId(peliculaId)) {
            return res.status(400).json({ error: "peliculaId inválido" });
        }

        parsedPeliculaId = parseInt(peliculaId, 10);
    }

    if (cineId !== undefined) {
        if (typeof cineId !== "string" || !isCineId(cineId)) {
            return res.status(400).json({ error: "cineId inválido" });
        }
    }

    if (parsedPeliculaId === undefined && cineId === undefined) {
        return res.status(400).json({ error: "Indica peliculaId o cineId" });
    }

    const horarios = await cargarHorarios(
        parsedPeliculaId,
        typeof cineId === "string" ? cineId : undefined,
    );

    return res.json(horarios.map(horarioPublico));
});

/** GET /api/funciones/precios requiere `peliculaId`, `cineId` y `fecha`. */
router.get("/precios", async (req, res) => {
    const { peliculaId, cineId, fecha } = req.query;

    if (
        typeof peliculaId !== "string" ||
        !isNumericId(peliculaId) ||
        typeof cineId !== "string" ||
        !isCineId(cineId) ||
        typeof fecha !== "string" ||
        !isDate(fecha)
    ) {
        return res.status(400).json({
            error: "Indica peliculaId, cineId y una fecha válida.",
        });
    }

    const horarios = await preciosPorCine(peliculaId, cineId, fecha);

    return res.json({
        horarios,
        cacheMinutos: 15,
    });
});

/** GET /api/funciones/butacas requiere `peliculaId`, `cineId` y `fecha`. */
router.get("/butacas", async (req, res) => {
    const { peliculaId, cineId, fecha } = req.query;

    if (
        typeof peliculaId !== "string" ||
        !isNumericId(peliculaId) ||
        typeof cineId !== "string" ||
        !isCineId(cineId) ||
        typeof fecha !== "string" ||
        !isDate(fecha)
    ) {
        return res.status(400).json({
            error: "Indica peliculaId, cineId y una fecha válida.",
        });
    }

    const horarios = await butacasPorCine(peliculaId, cineId, fecha);

    return res.json({
        horarios: horarios.map(horarioPublico),
        cacheSegundos: 120,
    });
});

/**
 * GET /api/funciones/detalle-stream transmite eventos NDJSON de precio, butacas y cierre.
 * Los mismos tres query params identifican película, cine y fecha.
 */
router.get("/detalle-stream", async (req, res) => {
    const { peliculaId, cineId, fecha } = req.query;

    if (
        typeof peliculaId !== "string" ||
        !isNumericId(peliculaId) ||
        typeof cineId !== "string" ||
        !isCineId(cineId) ||
        typeof fecha !== "string" ||
        !isDate(fecha)
    ) {
        return res.status(400).json({
            error: "Indica peliculaId, cineId y una fecha válida.",
        });
    }

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let cerrado = false;
    req.on("close", () => {
        cerrado = true;
    });

    const enviar = (evento: Record<string, unknown>) => {
        if (cerrado || res.writableEnded) return;
        res.write(`${JSON.stringify(evento)}\n`);
    };

    const [resPrecios, resButacas] = await Promise.allSettled([
        preciosPorCine(peliculaId, cineId, fecha, (horario) => {
            enviar({ tipo: "precio", horario });
        }),
        butacasPorCine(peliculaId, cineId, fecha, (horario) => {
            enviar({ tipo: "butaca", horario: horarioPublico(horario) });
        }),
    ]);

    enviar({
        tipo: "fin",
        falloPrecios: resPrecios.status === "rejected",
        falloButacas: resButacas.status === "rejected",
    });

    if (!res.writableEnded) res.end();
});

/** GET /api/funciones/:id. `id` debe ser numérico y corresponder a una tarifa. */
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (!isNumericId(id)) {
        return res.status(400).json({ error: "ID de funcion invalido" });
    }

    const funcion = await obtenerFuncion(parseInt(id, 10));

    if (funcion === null) {
        return res.status(404).json({ error: "Funcion no encontrada" });
    }

    return res.json(funcion);
});

export default router;

import { beforeEach, describe, expect, it } from "vitest";
import {
    crearCine,
    crearHorario,
    crearPelicula,
    limpiarBaseDeDatos,
} from "../../__tests__/helpers/database.ts";
import { query } from "../../db.ts";
import { importarDatosScraped } from "../import-data.ts";
import type { ScrapeResult } from "../types.ts";

const desde = "2035-07-17";

async function prepararCartelera() {
    const cine = await crearCine({ origenId: "1" });
    const otroCine = await crearCine({ origenId: "2" });
    const pelicula = await crearPelicula();
    const datosHorario = { peliculaId: pelicula.id, cineId: cine.id };
    const anterior = await crearHorario({
        ...datosHorario,
        fecha: "2035-07-16",
    });
    const obsoleto = await crearHorario({
        ...datosHorario,
        fecha: "2035-07-18",
        fechaCartelera: desde,
        horario: "00:15",
    });
    const posterior = await crearHorario({
        ...datosHorario,
        fecha: "2035-07-18",
    });
    const fueraDelCine = await crearHorario({
        ...datosHorario,
        cineId: otroCine.id,
        fecha: desde,
    });
    const otroOrigen = await crearHorario({
        ...datosHorario,
        origen: "cineplanet",
        fecha: desde,
    });

    const lote: ScrapeResult = {
        peliculas: [],
        cines: [
            {
                id: cine.id,
                origen: "cinemark",
                origenId: "1",
                extraidoEn: `${desde}T12:00:00Z`,
                nombre: "Cine de prueba",
                comuna: "Santiago",
                ciudad: "Santiago",
                direccion: "Av. de prueba 123",
                logo: "",
                url: "https://cines.test/cinemark/1",
            },
        ],
        funciones: [],
        horarios: [],
        incidencias: [],
        meta: {
            origen: "cinemark",
            version: 1,
            iniciadoEn: `${desde}T12:00:00Z`,
            completo: true,
            desde,
            dias: 1,
            limitePorCine: null,
            cinesSeleccionados: 1,
            cinesProcesados: 1,
            sesionesConsultadas: 0,
            moneda: "CLP",
            zonaHoraria: "America/Santiago",
            precioIncluyeServicio: false,
        },
    };

    return {
        lote,
        obsoleto: obsoleto.id,
        fueraDelAlcance: [
            anterior.id,
            posterior.id,
            fueraDelCine.id,
            otroOrigen.id,
        ],
    };
}

async function idsDeHorarios() {
    const { rows } = await query<{ id: number }>("SELECT id FROM horarios");
    return rows.map(({ id }) => id);
}

describe("Limpieza de cartelera al importar", () => {
    beforeEach(limpiarBaseDeDatos);

    it("conserva los horarios si la respuesta vacía reporta una incidencia", async () => {
        const { lote, obsoleto, fueraDelAlcance } = await prepararCartelera();
        lote.incidencias.push({
            cineId: lote.cines[0].id,
            etapa: "cine",
            mensaje: "El proveedor no entregó la cartelera",
        });

        expect(await importarDatosScraped(lote)).toMatchObject({
            limpiezaEjecutada: false,
            horariosEliminados: 0,
        });
        expect(await idsDeHorarios()).toEqual(
            expect.arrayContaining([obsoleto, ...fueraDelAlcance]),
        );
    });

    it("limpia un lote vacío completo dentro del origen, cine y fecha de cartelera", async () => {
        const { lote, fueraDelAlcance } = await prepararCartelera();

        expect(await importarDatosScraped(lote)).toMatchObject({
            limpiezaEjecutada: true,
            horariosEliminados: 1,
        });
        const restantes = await idsDeHorarios();
        expect(restantes).toHaveLength(fueraDelAlcance.length);
        expect(restantes).toEqual(expect.arrayContaining(fueraDelAlcance));
    });
});

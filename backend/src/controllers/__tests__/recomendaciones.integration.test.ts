import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, detenerApi, iniciarApi } from "../../__tests__/helpers/api.ts";
import {
    crearCine,
    crearHorario,
    crearPelicula,
    limpiarBaseDeDatos,
} from "../../__tests__/helpers/database.ts";
import { localNow } from "../../utils/localNow.ts";

const DIA = (desplazamiento: number) =>
    localNow(new Date(Date.now() + desplazamiento * 86_400_000)).slice(0, 10);

const FECHA = DIA(1);

describe("GET /api/recomendaciones (integracion con PostgreSQL)", () => {
    beforeAll(async () => {
        await iniciarApi();
    });

    afterAll(async () => {
        await detenerApi();
    });

    beforeEach(async () => {
        await limpiarBaseDeDatos();
    });

    async function sembrarCartelera() {
        const cineUno = await crearCine({
            id: "cinemark:1",
            cadena: "cinemark",
            origenId: "1",
            nombre: "Cinemark Uno",
        });
        const cineDos = await crearCine({
            id: "cinemark:2",
            cadena: "cinemark",
            origenId: "2",
            nombre: "Cinemark Dos",
        });

        const pelicula = await crearPelicula({
            titulo: "Recomendada",
            imagenUrl: "https://img.test/recomendada.jpg",
        });
        const otra = await crearPelicula({ titulo: "Otra Funcion" });

        const incluida = await crearHorario({
            peliculaId: pelicula.id,
            cineId: cineUno.id,
            fecha: FECHA,
            horario: "18:00",
            formatoResumen: "2D",
            idioma: "Doblada",
        });
        const incluidaTarde = await crearHorario({
            peliculaId: otra.id,
            cineId: cineUno.id,
            fecha: FECHA,
            horario: "19:30",
            formatoResumen: "3D",
            idioma: "Subtitulada",
        });
        await crearHorario({
            peliculaId: pelicula.id,
            cineId: cineUno.id,
            fecha: FECHA,
            horario: "21:30",
        });
        await crearHorario({
            peliculaId: pelicula.id,
            cineId: cineDos.id,
            fecha: FECHA,
            horario: "19:00",
        });
        await crearHorario({
            peliculaId: pelicula.id,
            cineId: cineUno.id,
            fecha: FECHA,
            horario: "19:15",
            agotada: true,
        });

        return { cineUno, cineDos, pelicula, otra, incluida, incluidaTarde };
    }

    it("devuelve funciones dentro de la ventana de 3 horas y solo de los cines indicados", async () => {
        const { cineUno, incluida, incluidaTarde } = await sembrarCartelera();

        const respuesta = await api(
            `/api/recomendaciones?fecha=${FECHA}&hora=17:00&cineIds=${cineUno.id}`,
        );
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo.map((h: { id: number }) => h.id)).toEqual([
            incluida.id,
            incluidaTarde.id,
        ]);
        expect(cuerpo[0]).toMatchObject({
            fechaHora: `${FECHA}T18:00:00`,
            peliculaTitulo: "Recomendada",
            peliculaImagenUrl: "https://img.test/recomendada.jpg",
            cineId: cineUno.id,
            cineNombre: "Cinemark Uno",
            formato: "2D",
            idioma: "Doblada",
        });
        expect(cuerpo[1]).toMatchObject({
            fechaHora: `${FECHA}T19:30:00`,
            formato: "3D",
        });
    });

    it("incluye el inicio y excluye el límite de tres horas al cruzar medianoche", async () => {
        const cine = await crearCine();
        const pelicula = await crearPelicula();
        const diaSiguiente = DIA(2);

        const horarios = [
            { fecha: FECHA, horario: "23:29:59" },
            { fecha: FECHA, horario: "23:30:00" },
            { fecha: diaSiguiente, horario: "02:29:59" },
            { fecha: diaSiguiente, horario: "02:30:00" },
        ];
        const ids: number[] = [];
        for (const horario of horarios) {
            const funcion = await crearHorario({
                cineId: cine.id,
                peliculaId: pelicula.id,
                ...horario,
            });
            ids.push(funcion.id);
        }

        const respuesta = await api(
            `/api/recomendaciones?fecha=${FECHA}&hora=23:30&cineIds=${cine.id}`,
        );
        expect(respuesta.status).toBe(200);
        const cuerpo = await respuesta.json();
        expect(cuerpo.map((funcion: { id: number }) => funcion.id)).toEqual(
            ids.slice(1, 3),
        );
    });

    it("deduplica cineIds repetidos", async () => {
        const { cineUno } = await sembrarCartelera();

        const respuesta = await api(
            `/api/recomendaciones?fecha=${FECHA}&hora=17:00&cineIds=${cineUno.id},${cineUno.id}`,
        );
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toHaveLength(2);
    });

    it("valida fecha, hora y cines", async () => {
        const casos = [
            "/api/recomendaciones?hora=17:00&cineIds=cinemark:1",
            "/api/recomendaciones?fecha=2026-02-31&hora=17:00&cineIds=cinemark:1",
            "/api/recomendaciones?fecha=2026-11-22&hora=25:00&cineIds=cinemark:1",
            "/api/recomendaciones?fecha=2026-11-22&hora=17:00&cineIds=",
            `/api/recomendaciones?fecha=2026-11-22&hora=17:00&cineIds=${"a".repeat(101)}`,
        ];

        for (const ruta of casos) {
            const respuesta = await api(ruta);
            expect(respuesta.status).toBe(400);
        }
    });
});

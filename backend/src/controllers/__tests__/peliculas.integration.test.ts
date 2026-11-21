import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, detenerApi, iniciarApi } from "../../__tests__/helpers/api.ts";
import {
    crearCine,
    crearFuente,
    crearHorario,
    crearPelicula,
    crearUsuario,
    limpiarBaseDeDatos,
} from "../../__tests__/helpers/database.ts";
import { query } from "../../db.ts";
import { localNow } from "../../utils/localNow.ts";

const DIA = (desplazamiento: number) =>
    localNow(new Date(Date.now() + desplazamiento * 86_400_000)).slice(0, 10);

describe("GET /api/peliculas (integracion con PostgreSQL)", () => {
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
        const cineA = await crearCine({
            cadena: "cinemark",
            nombre: "Cinemark Costanera",
        });
        const cineB = await crearCine({
            cadena: "cineplanet",
            nombre: "Cineplanet Costanera",
        });

        const enCartelera = await crearPelicula({
            titulo: "Alpha",
            genero: "Accion",
        });
        const proxima = await crearPelicula({ titulo: "Zeta Proxima" });
        const sinFunciones = await crearPelicula({
            titulo: "Beta Sin Funciones",
        });

        await crearFuente({
            peliculaId: enCartelera.id,
            origen: "cinemark",
            origenId: `m${enCartelera.id}`,
            estadoEstreno: "cartelera",
            fechaEstreno: DIA(-5),
        });
        await crearFuente({
            peliculaId: proxima.id,
            origen: "cinemark",
            origenId: `m${proxima.id}`,
            estadoEstreno: "proximamente",
            fechaEstreno: DIA(30),
        });

        await crearHorario({
            peliculaId: enCartelera.id,
            cineId: cineA.id,
            peliculaOrigenId: `m${enCartelera.id}`,
            horario: "18:00",
        });
        await crearHorario({
            peliculaId: enCartelera.id,
            cineId: cineA.id,
            peliculaOrigenId: `m${enCartelera.id}`,
            horario: "20:00",
            agotada: true,
        });
        await crearHorario({
            peliculaId: enCartelera.id,
            cineId: cineB.id,
            peliculaOrigenId: `m${enCartelera.id}`,
            horario: "21:00",
        });
        await crearHorario({
            peliculaId: enCartelera.id,
            cineId: cineA.id,
            peliculaOrigenId: `m${enCartelera.id}`,
            fecha: DIA(-1),
        });
        await crearHorario({
            peliculaId: proxima.id,
            cineId: cineA.id,
            peliculaOrigenId: `m${proxima.id}`,
        });

        const usuarioA = await crearUsuario({
            email: "favorito-a@test.cl",
        });
        const usuarioB = await crearUsuario({
            email: "favorito-b@test.cl",
        });
        await query(
            "INSERT INTO favoritos_peliculas (user_id, pelicula_id) VALUES ($1, $2), ($3, $2);",
            [usuarioA.id, enCartelera.id, usuarioB.id],
        );

        return { cineA, cineB, enCartelera, proxima, sinFunciones };
    }

    it("con cartelera=true devuelve solo peliculas con funciones vigentes no agotadas y agrega popularidad", async () => {
        const { enCartelera } = await sembrarCartelera();

        const respuesta = await api("/api/peliculas?cartelera=true");
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toHaveLength(1);
        expect(cuerpo[0]).toMatchObject({
            id: String(enCartelera.id),
            titulo: "Alpha",
            genero: "Accion",
            clasificacion: "TE+7",
            estadoEstreno: "cartelera",
            fechaEstreno: DIA(-5),
            totalCines: 2,
            totalFunciones: 2,
            totalFavoritos: 2,
        });
    });

    it("sin filtro devuelve todo el catalogo ordenado por titulo y clasifica preventas por fecha futura", async () => {
        const { enCartelera, proxima, sinFunciones } = await sembrarCartelera();
        const preventa = await crearPelicula({ titulo: "Gamma Preventa" });
        await crearFuente({
            peliculaId: preventa.id,
            origenId: `m${preventa.id}`,
            fechaEstreno: DIA(10),
        });

        const respuesta = await api("/api/peliculas");
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo.map((p: { titulo: string }) => p.titulo)).toEqual([
            "Alpha",
            "Beta Sin Funciones",
            "Gamma Preventa",
            "Zeta Proxima",
        ]);

        const porId = new Map(cuerpo.map((p: { id: string }) => [p.id, p]));
        expect(porId.get(String(enCartelera.id))).toMatchObject({
            estadoEstreno: "cartelera",
        });
        expect(porId.get(String(preventa.id))).toMatchObject({
            estadoEstreno: "preventa",
            fechaEstreno: DIA(10),
        });
        expect(porId.get(String(proxima.id))).toMatchObject({
            estadoEstreno: "proximamente",
        });
        expect(porId.get(String(sinFunciones.id))).toMatchObject({
            estadoEstreno: "cartelera",
        });
    });

    it("rechaza un valor invalido de cartelera", async () => {
        const respuesta = await api("/api/peliculas?cartelera=si");

        expect(respuesta.status).toBe(400);
        expect(await respuesta.json()).toEqual({
            error: "cartelera debe ser true o false",
        });
    });

    it("expone el detalle de una pelicula con poster limpio y trailer solo si la version es valida", async () => {
        const cine = await crearCine();
        const pelicula = await crearPelicula({
            titulo: "Detalle",
            posterLimpio: "https://img.test/poster-limpio.jpg",
            trailerUrl: "https://youtube.test/watch?v=abc",
            trailerIdioma: "es",
            trailerVersion: "doblado",
            tmdbId: 123,
            calificacionTmdb: 7.5,
            votosTmdb: 1000,
            popularidadTmdb: 42.5,
            fechaEstrenoTmdb: DIA(-20),
        });
        const sinTrailer = await crearPelicula({
            titulo: "Sin trailer valido",
            trailerUrl: "https://youtube.test/watch?v=xyz",
            trailerVersion: "doblado",
        });
        await crearHorario({
            peliculaId: pelicula.id,
            cineId: cine.id,
            peliculaOrigenId: `m${pelicula.id}`,
        });

        const respuesta = await api(`/api/peliculas/${pelicula.id}`);
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toMatchObject({
            id: String(pelicula.id),
            titulo: "Detalle",
            poster: "https://img.test/poster.jpg",
            posterLimpio: "https://img.test/poster-limpio.jpg",
            trailerUrl: "https://youtube.test/watch?v=abc",
            trailerVersion: "doblado",
            tmdbId: 123,
            calificacionTmdb: 7.5,
            votosTmdb: 1000,
            popularidadTmdb: 42.5,
            estadoEstreno: "cartelera",
            totalFavoritos: 0,
        });

        const respuestaSinTrailer = await api(
            `/api/peliculas/${sinTrailer.id}`,
        );
        const cuerpoSinTrailer = await respuestaSinTrailer.json();

        expect(respuestaSinTrailer.status).toBe(200);
        expect(cuerpoSinTrailer.trailerUrl).toBeUndefined();
        expect(cuerpoSinTrailer.trailerVersion).toBeUndefined();
    });

    it("valida el id y responde 404 cuando la pelicula no existe", async () => {
        const invalido = await api("/api/peliculas/abc");
        expect(invalido.status).toBe(400);
        expect(await invalido.json()).toEqual({
            error: "ID de película inválido",
        });

        const inexistente = await api("/api/peliculas/999999");
        expect(inexistente.status).toBe(404);
        expect(await inexistente.json()).toEqual({
            error: "Película no encontrada",
        });
    });
});

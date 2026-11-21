import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, detenerApi, iniciarApi } from "../../__tests__/helpers/api.ts";
import {
    crearCine,
    crearFuente,
    crearHorario,
    crearPelicula,
    crearTarifa,
    limpiarBaseDeDatos,
} from "../../__tests__/helpers/database.ts";
import { localNow } from "../../utils/localNow.ts";

const DIA = (desplazamiento: number) =>
    localNow(new Date(Date.now() + desplazamiento * 86_400_000)).slice(0, 10);

describe("API de funciones (integracion con PostgreSQL)", () => {
    beforeAll(async () => {
        await iniciarApi();
    });

    afterAll(async () => {
        await detenerApi();
    });

    beforeEach(async () => {
        await limpiarBaseDeDatos();
    });

    async function sembrarFunciones() {
        const cineA = await crearCine({
            id: "cinemark:1",
            cadena: "cinemark",
            origenId: "1",
            nombre: "Cinemark Uno",
            direccion: "Calle Uno 100",
        });
        const cineB = await crearCine({
            id: "cineplanet:2",
            cadena: "cineplanet",
            origenId: "2",
            nombre: "Cineplanet Dos",
            direccion: "Calle Dos 200",
        });

        const pelicula = await crearPelicula({
            titulo: "Funcion de Prueba",
            duracion: 130,
            clasificacion: "+14",
        });

        await crearFuente({
            peliculaId: pelicula.id,
            origen: "cinemark",
            origenId: `m${pelicula.id}`,
            url: "https://cines.test/cinemark/pelicula/funcion",
            estadoEstreno: "cartelera",
            fechaEstreno: DIA(-3),
        });
        await crearFuente({
            peliculaId: pelicula.id,
            origen: "cineplanet",
            origenId: `m${pelicula.id}`,
            url: "https://cines.test/cineplanet/pelicula/funcion",
            estadoEstreno: "cartelera",
            fechaEstreno: DIA(-3),
        });

        const enCineA = await crearHorario({
            peliculaId: pelicula.id,
            cineId: cineA.id,
            peliculaOrigenId: `m${pelicula.id}`,
            fecha: DIA(1),
            horario: "18:00",
            formatoResumen: "2D",
            idioma: "Doblada",
            sala: "Sala 1",
        });
        const enCineB = await crearHorario({
            peliculaId: pelicula.id,
            cineId: cineB.id,
            peliculaOrigenId: `m${pelicula.id}`,
            fecha: DIA(1),
            horario: "21:00",
            formatoResumen: "3D",
            idioma: "Subtitulada",
            sala: "Sala 2",
        });
        const agotada = await crearHorario({
            peliculaId: pelicula.id,
            cineId: cineA.id,
            peliculaOrigenId: `m${pelicula.id}`,
            fecha: DIA(1),
            horario: "22:00",
            agotada: true,
        });
        const pasada = await crearHorario({
            peliculaId: pelicula.id,
            cineId: cineA.id,
            peliculaOrigenId: `m${pelicula.id}`,
            fecha: DIA(-1),
            horario: "18:00",
        });

        await crearTarifa({ horarioId: enCineA.id, precio: 5000 });
        await crearTarifa({
            horarioId: enCineA.id,
            precio: 7000,
            tipoEntrada: "Estudiante",
        });
        await crearTarifa({ horarioId: enCineB.id, precio: 6000 });

        return { cineA, cineB, pelicula, enCineA, enCineB, agotada, pasada };
    }

    it("lista funciones vigentes y no agotadas con el precio minimo de sus tarifas", async () => {
        const { cineA, cineB, pelicula, enCineA, enCineB } =
            await sembrarFunciones();

        const respuesta = await api(`/api/funciones?peliculaId=${pelicula.id}`);
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toHaveLength(2);
        expect(cuerpo.map((f: { id: number }) => f.id)).toEqual([
            enCineA.id,
            enCineB.id,
        ]);
        expect(cuerpo[0]).toMatchObject({
            precio: 5000,
            sala: "Sala 1",
            formato: "2D",
            agotada: false,
            peliculaId: pelicula.id,
            peliculaTitulo: "Funcion de Prueba",
            cineId: cineA.id,
            cineNombre: "Cinemark Uno",
        });
        expect(cuerpo[1]).toMatchObject({
            precio: 6000,
            cineId: cineB.id,
            cineNombre: "Cineplanet Dos",
        });
        expect(String(cuerpo[0].fechaHora)).toContain(DIA(1));
    });

    it("filtra funciones por cine", async () => {
        const { cineA, enCineA } = await sembrarFunciones();

        const respuesta = await api(`/api/funciones?cineId=${cineA.id}`);
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toHaveLength(1);
        expect(cuerpo[0].id).toBe(enCineA.id);
    });

    it("valida los filtros de funciones", async () => {
        const peliculaInvalida = await api("/api/funciones?peliculaId=abc");
        expect(peliculaInvalida.status).toBe(400);

        const cineVacio = await api("/api/funciones?cineId=");
        expect(cineVacio.status).toBe(400);
    });

    it("obtiene el detalle de una funcion y responde 404 si no existe", async () => {
        const { enCineA } = await sembrarFunciones();

        const respuesta = await api(`/api/funciones/${enCineA.id}`);
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toMatchObject({
            id: enCineA.id,
            precio: 5000,
            peliculaTitulo: "Funcion de Prueba",
            peliculaDuracion: 130,
            peliculaClasificacion: "+14",
            cineNombre: "Cinemark Uno",
            cineDireccion: "Calle Uno 100",
        });

        const inexistente = await api("/api/funciones/999999");
        expect(inexistente.status).toBe(404);

        const invalida = await api("/api/funciones/abc");
        expect(invalida.status).toBe(400);
    });

    it("horarios exige peliculaId o cineId y devuelve estado publico con precio y butacas", async () => {
        const { pelicula, cineA, enCineA } = await sembrarFunciones();

        const sinFiltros = await api("/api/funciones/horarios");
        expect(sinFiltros.status).toBe(400);

        const respuesta = await api(
            `/api/funciones/horarios?peliculaId=${pelicula.id}&cineId=${cineA.id}`,
        );
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toHaveLength(1);
        expect(cuerpo[0]).toMatchObject({
            id: String(enCineA.id),
            peliculaId: String(pelicula.id),
            cineId: cineA.id,
            fecha: DIA(1),
            fechaCartelera: DIA(1),
            horario: "18:00",
            formatoResumen: "2D",
            idioma: "Doblada",
            sala: "Sala 1",
            agotada: false,
            estadoPrecio: "disponible",
            estadoButacas: "disponible",
        });
        expect(cuerpo[0].tarifas).toHaveLength(2);
        expect(cuerpo[0].tarifas[0]).toMatchObject({
            tipoEntrada: "General",
            precio: 5000,
            precioOnline: 5500,
            peliculaId: String(pelicula.id),
            cineId: cineA.id,
        });
        expect(cuerpo[0].butacas).toMatchObject({
            disponibles: 80,
            total: 100,
            porcentajeNoDisponible: 20,
        });
    });

    it("precios devuelve tarifas desde la base y conserva funciones agotadas marcadas", async () => {
        const { pelicula, cineA, enCineA, agotada } = await sembrarFunciones();

        const faltanParametros = await api("/api/funciones/precios");
        expect(faltanParametros.status).toBe(400);

        const fechaInvalida = await api(
            `/api/funciones/precios?peliculaId=${pelicula.id}&cineId=${cineA.id}&fecha=2026-02-31`,
        );
        expect(fechaInvalida.status).toBe(400);

        const respuesta = await api(
            `/api/funciones/precios?peliculaId=${pelicula.id}&cineId=${cineA.id}&fecha=${DIA(1)}`,
        );
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo.cacheMinutos).toBe(15);
        expect(cuerpo.horarios).toHaveLength(2);

        const disponible = cuerpo.horarios.find(
            (h: { id: string }) => h.id === String(enCineA.id),
        );
        const agotadaRespuesta = cuerpo.horarios.find(
            (h: { id: string }) => h.id === String(agotada.id),
        );

        expect(disponible).toMatchObject({
            estadoPrecio: "disponible",
            agotada: false,
        });
        expect(disponible.tarifas).toHaveLength(2);
        expect(disponible.tarifas[0]).toMatchObject({
            precio: 5000,
            precioOnline: 5500,
        });
        expect(agotadaRespuesta).toMatchObject({
            estadoPrecio: "agotada",
            agotada: true,
        });
    });

    it("butacas devuelve la ocupacion guardada sin consultar al scraper cuando esta vigente", async () => {
        const { pelicula, cineB, enCineB } = await sembrarFunciones();

        const faltanParametros = await api("/api/funciones/butacas");
        expect(faltanParametros.status).toBe(400);

        const respuesta = await api(
            `/api/funciones/butacas?peliculaId=${pelicula.id}&cineId=${cineB.id}&fecha=${DIA(1)}`,
        );
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo.cacheSegundos).toBe(120);
        expect(cuerpo.horarios).toHaveLength(1);
        expect(cuerpo.horarios[0]).toMatchObject({
            id: String(enCineB.id),
            estadoButacas: "disponible",
            butacas: {
                disponibles: 80,
                total: 100,
                porcentajeNoDisponible: 20,
            },
        });
    });
});

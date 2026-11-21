import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, detenerApi, iniciarApi } from "../../__tests__/helpers/api.ts";
import {
    crearCine,
    limpiarBaseDeDatos,
} from "../../__tests__/helpers/database.ts";

describe("GET /api/cines (integracion con PostgreSQL)", () => {
    beforeAll(async () => {
        await iniciarApi();
    });

    afterAll(async () => {
        await detenerApi();
    });

    beforeEach(async () => {
        await limpiarBaseDeDatos();
    });

    async function sembrarCines() {
        const nunoa = await crearCine({
            id: "cinemark:10",
            cadena: "cinemark",
            origenId: "10",
            nombre: "Cinemark Ñuñoa",
            comuna: "Ñuñoa",
            ciudad: "Santiago",
            logoUrl: null,
            latitud: null,
            longitud: null,
        });
        const centro = await crearCine({
            id: "cineplanet:20",
            cadena: "cineplanet",
            origenId: "20",
            nombre: "Cineplanet Centro",
            comuna: "SANTIAGO",
        });
        const vina = await crearCine({
            id: "cinemark:30",
            cadena: "cinemark",
            origenId: "30",
            nombre: "Cinemark Viña",
            comuna: "VINA DEL MAR",
            ciudad: "Viña del Mar",
        });

        return { nunoa, centro, vina };
    }

    it("lista todos los cines serializando solo los campos presentes", async () => {
        await sembrarCines();

        const respuesta = await api("/api/cines");
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toHaveLength(3);

        const nunoa = cuerpo.find(
            (cine: { id: string }) => cine.id === "cinemark:10",
        );
        expect(nunoa).toMatchObject({
            id: "cinemark:10",
            nombre: "Cinemark Ñuñoa",
            comuna: "Ñuñoa",
            direccion: "Av. Siempre Viva 123",
            ciudad: "Santiago",
            origen: "cinemark",
            url: "https://cines.test/cinemark/10",
        });
        expect(nunoa.logo).toBeUndefined();
        expect(nunoa.latitud).toBeUndefined();
        expect(nunoa.longitud).toBeUndefined();
    });

    it("filtra por cadena sin distinguir mayusculas ni espacios", async () => {
        await sembrarCines();

        const respuesta = await api("/api/cines?cadena=%20CINEMARK%20");
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo.map((cine: { id: string }) => cine.id).sort()).toEqual([
            "cinemark:10",
            "cinemark:30",
        ]);
    });

    it("filtra por comuna normalizando acentos y mayusculas", async () => {
        await sembrarCines();

        const sinAcento = await api("/api/cines?comuna=nunoa");
        const cuerpoSinAcento = await sinAcento.json();
        expect(sinAcento.status).toBe(200);
        expect(cuerpoSinAcento).toHaveLength(1);
        expect(cuerpoSinAcento[0]).toMatchObject({
            id: "cinemark:10",
            comuna: "Ñuñoa",
        });

        const vina = await api("/api/cines?comuna=vina%20del%20mar");
        const cuerpoVina = await vina.json();
        expect(vina.status).toBe(200);
        expect(cuerpoVina).toHaveLength(1);
        expect(cuerpoVina[0]).toMatchObject({
            id: "cinemark:30",
            comuna: "Viña del Mar",
        });
    });

    it("rechaza filtros vacios o demasiado largos", async () => {
        const cadenaVacia = await api("/api/cines?cadena=%20");
        expect(cadenaVacia.status).toBe(400);

        const comunaLarga = await api(`/api/cines?comuna=${"a".repeat(101)}`);
        expect(comunaLarga.status).toBe(400);
    });

    it("obtiene un cine por id y responde 404 si no existe", async () => {
        await sembrarCines();

        const respuesta = await api("/api/cines/cineplanet:20");
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toMatchObject({
            id: "cineplanet:20",
            nombre: "Cineplanet Centro",
            comuna: "Santiago",
            origen: "cineplanet",
        });

        const inexistente = await api("/api/cines/cinemark:999");
        expect(inexistente.status).toBe(404);
        expect(await inexistente.json()).toEqual({
            error: "Cine no encontrado",
        });
    });

    it("rechaza un id de cine demasiado largo", async () => {
        const respuesta = await api(`/api/cines/${"a".repeat(101)}`);

        expect(respuesta.status).toBe(400);
        expect(await respuesta.json()).toEqual({
            error: "ID de cine invalido",
        });
    });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api, detenerApi, iniciarApi } from "../../__tests__/helpers/api.ts";
import {
    crearCine,
    crearHorario,
    crearPelicula,
    limpiarBaseDeDatos,
} from "../../__tests__/helpers/database.ts";
import { localNow } from "../../utils/localNow.ts";

describe("Visibilidad de funciones secretas ya importadas", () => {
    beforeAll(async () => {
        await iniciarApi();
        await limpiarBaseDeDatos();
    });

    afterAll(async () => {
        await detenerApi();
    });

    it("excluye las funciones secretas del catálogo, los horarios y las recomendaciones", async () => {
        const cine = await crearCine({ cadena: "cinepolis" });
        const fecha = localNow(new Date(Date.now() + 86_400_000)).slice(0, 10);
        const titulos = [
            "FUNCION SECRETA 25",
            "Función secreta 20",
            "Función secreta",
            "El secreto de sus ojos",
        ];
        const funciones = [];
        for (const titulo of titulos) {
            const pelicula = await crearPelicula({ titulo });
            const horario = await crearHorario({
                peliculaId: pelicula.id,
                cineId: cine.id,
                fecha,
                horario: "19:00",
            });
            funciones.push({ pelicula, horario });
        }

        for (const ruta of ["/api/peliculas", "/api/peliculas?cartelera=true"]) {
            const respuesta = await api(ruta);
            expect(respuesta.status).toBe(200);
            expect(await respuesta.json()).toEqual([
                expect.objectContaining({ titulo: "El secreto de sus ojos" }),
            ]);
        }

        const visible = funciones.at(-1)!;
        for (const ruta of [
            `/api/funciones?cineId=${cine.id}`,
            `/api/funciones/horarios?cineId=${cine.id}`,
            `/api/recomendaciones?fecha=${fecha}&hora=18:00&cineIds=${cine.id}`,
        ]) {
            const respuesta = await api(ruta);
            expect(respuesta.status).toBe(200);
            const horarios = (await respuesta.json()) as Array<{
                id: string | number;
            }>;
            expect(horarios.map(({ id }) => String(id))).toEqual([
                String(visible.horario.id),
            ]);
        }

        for (const { pelicula, horario } of funciones.slice(0, -1)) {
            expect((await api(`/api/peliculas/${pelicula.id}`)).status).toBe(404);
            expect((await api(`/api/funciones/${horario.id}`)).status).toBe(404);
        }

        const { pelicula } = funciones[0]!;
        const filtros = `peliculaId=${pelicula.id}&cineId=${cine.id}&fecha=${fecha}`;
        for (const ruta of ["precios", "butacas"]) {
            const respuesta = await api(`/api/funciones/${ruta}?${filtros}`);
            expect(respuesta.status).toBe(200);
            expect(await respuesta.json()).toMatchObject({ horarios: [] });
        }
    });
});

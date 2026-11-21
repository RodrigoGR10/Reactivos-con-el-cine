import { beforeEach, describe, expect, it } from "vitest";
import {
    crearCine,
    crearHorario,
    crearPelicula,
    crearUsuario,
    limpiarBaseDeDatos,
} from "../../__tests__/helpers/database.ts";
import { query } from "../../db.ts";
import { listarFunciones } from "../funciones/consulta.ts";
import { listarPeliculas } from "../peliculas/consulta.ts";
import { incluirPopularidad } from "../popularidadPeliculas.ts";
import { localNow } from "../../utils/localNow.ts";

const momentoLocal = (desplazamientoMs: number) => {
    const iso = localNow(new Date(Date.now() + desplazamientoMs));
    return { fecha: iso.slice(0, 10), horario: iso.slice(11, 16) };
};

describe("Servicios SQL contra PostgreSQL", () => {
    beforeEach(async () => {
        await limpiarBaseDeDatos();
    });

    describe("incluirPopularidad", () => {
        it("cuenta usuarios distintos por pelicula y deja en cero las sin favoritos", async () => {
            const peliculaA = await crearPelicula({ titulo: "A" });
            const peliculaB = await crearPelicula({ titulo: "B" });
            const usuarioUno = await crearUsuario({ email: "uno@test.cl" });
            const usuarioDos = await crearUsuario({ email: "dos@test.cl" });

            await query(
                `INSERT INTO favoritos_peliculas (user_id, pelicula_id)
                 VALUES ($1, $3), ($2, $3), ($1, $4);`,
                [usuarioUno.id, usuarioDos.id, peliculaA.id, peliculaB.id],
            );

            const resultado = await incluirPopularidad([
                { id: String(peliculaA.id) },
                { id: String(peliculaB.id) },
                { id: "999999" },
            ]);

            expect(resultado).toEqual([
                { id: String(peliculaA.id), totalFavoritos: 2 },
                { id: String(peliculaB.id), totalFavoritos: 1 },
                { id: "999999", totalFavoritos: 0 },
            ]);
        });

        it("no consulta la base con ids invalidos y respeta la lista vacia", async () => {
            expect(await incluirPopularidad([])).toEqual([]);

            const resultado = await incluirPopularidad([
                { id: "abc" },
                { id: "0" },
            ]);
            expect(resultado).toEqual([
                { id: "abc", totalFavoritos: 0 },
                { id: "0", totalFavoritos: 0 },
            ]);
        });
    });

    describe("listarPeliculas", () => {
        it("usa la hora de Chile para decidir que funciones estan vigentes", async () => {
            const cine = await crearCine();
            const pelicula = await crearPelicula({ titulo: "Vigente" });
            const futura = momentoLocal(60 * 60 * 1000);
            const pasada = momentoLocal(-2 * 60 * 1000);

            await crearHorario({
                peliculaId: pelicula.id,
                cineId: cine.id,
                fecha: futura.fecha,
                horario: futura.horario,
            });
            await crearHorario({
                peliculaId: pelicula.id,
                cineId: cine.id,
                fecha: pasada.fecha,
                horario: pasada.horario,
            });

            const cartelera = await listarPeliculas(true);

            expect(cartelera).toHaveLength(1);
            expect(cartelera[0]).toMatchObject({
                id: String(pelicula.id),
                totalCines: 1,
                totalFunciones: 1,
            });
        });

        it("descarta peliculas agotadas y proximamente aunque tengan horarios futuros", async () => {
            const cine = await crearCine();
            const agotada = await crearPelicula({ titulo: "Agotada" });
            const proxima = await crearPelicula({ titulo: "Proxima" });
            const futura = momentoLocal(60 * 60 * 1000);

            await crearHorario({
                peliculaId: agotada.id,
                cineId: cine.id,
                fecha: futura.fecha,
                horario: futura.horario,
                agotada: true,
            });
            await crearHorario({
                peliculaId: proxima.id,
                cineId: cine.id,
                fecha: futura.fecha,
                horario: futura.horario,
            });
            await query(
                `INSERT INTO pelicula_fuentes (origen, origen_id, pelicula_id, estado_estreno)
                 VALUES ('cinemark', $1, $2, 'proximamente');`,
                [`m${proxima.id}`, proxima.id],
            );

            const cartelera = await listarPeliculas(true);

            expect(cartelera).toEqual([]);
        });
    });

    describe("listarFunciones", () => {
        it("filtra por pelicula y cine y ordena por fecha y hora", async () => {
            const cineUno = await crearCine({ id: "cinemark:1" });
            const cineDos = await crearCine({ id: "cinemark:2" });
            const pelicula = await crearPelicula({ titulo: "Con funciones" });
            const futura = momentoLocal(60 * 60 * 1000);

            await crearHorario({
                peliculaId: pelicula.id,
                cineId: cineDos.id,
                fecha: futura.fecha,
                horario: futura.horario,
            });
            await crearHorario({
                peliculaId: pelicula.id,
                cineId: cineUno.id,
                fecha: futura.fecha,
                horario: futura.horario,
            });

            const deUno = await listarFunciones({
                peliculaId: pelicula.id,
                cineId: cineUno.id,
            });
            expect(deUno).toHaveLength(1);
            expect(deUno[0]).toMatchObject({
                peliculaId: pelicula.id,
                cineId: cineUno.id,
                peliculaTitulo: "Con funciones",
            });

            const todas = await listarFunciones({ peliculaId: pelicula.id });
            expect(todas).toHaveLength(2);
        });
    });
});

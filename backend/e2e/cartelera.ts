import {
    crearCine,
    crearFuente,
    crearHorario,
    crearPelicula,
    crearTarifa,
    limpiarBaseDeDatos,
} from "../src/__tests__/helpers/database.ts";
import { localNow } from "../src/utils/localNow.ts";

export async function sembrarCartelera() {
    await limpiarBaseDeDatos();

    const alameda = await crearCine({
        nombre: "Cine Alameda",
        comuna: "Santiago",
    });
    const plaza = await crearCine({
        nombre: "Cine Plaza",
        comuna: "Providencia",
    });
    const orbita = await crearPelicula({
        titulo: "Órbita Austral",
        genero: "Drama",
        imagenUrl: "/logo.jpg",
    });
    const viaje = await crearPelicula({
        titulo: "El viaje del sur",
        genero: "Aventura",
        imagenUrl: "/logo.jpg",
    });

    for (const pelicula of [orbita, viaje]) {
        await crearFuente({
            peliculaId: pelicula.id,
            origenId: `m${pelicula.id}`,
            estadoEstreno: "cartelera",
        });
    }

    const pasadoManana = localNow(new Date(Date.now() + 2 * 86_400_000)).slice(
        0,
        10,
    );
    await crearHorario({
        peliculaId: orbita.id,
        cineId: alameda.id,
        horario: "16:00",
    });
    const horario = await crearHorario({
        peliculaId: orbita.id,
        cineId: alameda.id,
        fecha: pasadoManana,
        horario: "20:00",
    });
    await crearTarifa({
        horarioId: horario.id,
        precio: 4500,
        precioOnline: 4500,
    });
    await crearHorario({ peliculaId: viaje.id, cineId: plaza.id });
}

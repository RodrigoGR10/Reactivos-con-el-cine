import {
    crearCine,
    crearFuente,
    crearHorario,
    crearPelicula,
    crearTarifa,
    limpiarBaseDeDatos,
} from "../src/__tests__/helpers/database.ts";
import { query } from "../src/db.ts";
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
        peliculaOrigenId: "fuente-ausente",
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
    const sinButacas = await crearHorario({
        peliculaId: viaje.id,
        cineId: plaza.id,
        butacasFrescas: false,
    });
    await crearTarifa({
        horarioId: sinButacas.id,
        precio: 4500,
        precioOnline: 4500,
    });
    // Un error vigente del proveedor evita reintentar con un sitio externo.
    await query(
        `UPDATE horarios
         SET butacas_error_revision = revision,
             butacas_error_hasta = NOW() + INTERVAL '1 hour'
         WHERE id = $1`,
        [sinButacas.id],
    );

    await crearHorario({
        peliculaId: viaje.id,
        cineId: plaza.id,
        fecha: pasadoManana,
        horario: "00:15",
    });
}

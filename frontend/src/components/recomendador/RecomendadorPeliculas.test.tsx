// @vitest-environment jsdom
import { HeadlessMantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cinesService from "../../services/cines";
import recomendacionesService from "../../services/recomendaciones";
import RecomendadorPeliculas from "./RecomendadorPeliculas";

vi.mock("../../services/cines", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../../services/recomendaciones", () => ({
    default: { getFuncionesDisponibles: vi.fn() },
}));

const consultarFunciones = vi.mocked(
    recomendacionesService.getFuncionesDisponibles,
);
const funcion = {
    id: "1",
    fechaHora: "2030-07-17T18:00:00",
    peliculaId: "10",
    peliculaTitulo: "Órbita",
    cineId: "alameda",
    cineNombre: "Cine Alameda",
};

function renderRecomendador() {
    const user = userEvent.setup();
    render(
        <HeadlessMantineProvider env="test">
            <MemoryRouter>
                <RecomendadorPeliculas />
            </MemoryRouter>
        </HeadlessMantineProvider>,
    );
    return user;
}

async function elegirComuna(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
        await screen.findByRole("button", {
            name: /seleccionar comuna: selecciona una opción/i,
        }),
    );
    await user.click(await screen.findByRole("option", { name: "Santiago" }));
}

describe("RecomendadorPeliculas", () => {
    beforeEach(() => {
        vi.setSystemTime(new Date(2030, 6, 17, 17, 0));
        vi.mocked(cinesService.getAll).mockResolvedValue([
            { id: "alameda", nombre: "Cine Alameda", comuna: "Santiago" },
            { id: "centro", nombre: "Cine Centro", comuna: "Santiago" },
            { id: "plaza", nombre: "Cine Plaza", comuna: "Providencia" },
        ]);
        consultarFunciones.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("consulta los cines de la comuna y muestra una opción por película", async () => {
        consultarFunciones.mockResolvedValueOnce([
            funcion,
            { ...funcion, id: "2", peliculaTitulo: "ORBITA!" },
            {
                ...funcion,
                id: "3",
                peliculaId: "20",
                peliculaTitulo: "El viaje",
            },
        ]);
        const user = renderRecomendador();
        const enviar = screen.getByRole("button", {
            name: "Recomiéndame películas",
        });
        expect(enviar).toBeDisabled();

        await elegirComuna(user);
        await user.click(enviar);

        expect(consultarFunciones).toHaveBeenCalledExactlyOnceWith(
            "2030-07-17",
            "17:15",
            ["alameda", "centro"],
        );
        expect(await screen.findByText("2 opciones al azar")).toBeVisible();
        expect(
            screen.getAllByRole("link", { name: /ver detalles de/i }),
        ).toHaveLength(2);
        expect(
            screen.getByRole("link", { name: /ver detalles de [oó]rbita/i }),
        ).toHaveAttribute(
            "href",
            "/peliculas/10?fecha=2030-07-17&cineId=alameda",
        );
    });

    it("avisa cuando la consulta no encuentra funciones", async () => {
        consultarFunciones.mockResolvedValueOnce([]);
        const user = renderRecomendador();
        await elegirComuna(user);
        await user.click(
            screen.getByRole("button", { name: "Recomiéndame películas" }),
        );

        expect(await screen.findByRole("status")).toHaveTextContent(
            "No encontramos funciones en esa zona dentro de las tres horas siguientes.",
        );
        expect(
            screen.queryByRole("link", { name: /ver detalles de/i }),
        ).not.toBeInTheDocument();
    });

    it("muestra el error de consulta y habilita el botón para reintentar", async () => {
        consultarFunciones.mockRejectedValueOnce(new Error("Servicio caído"));
        const user = renderRecomendador();
        await elegirComuna(user);
        const enviar = screen.getByRole("button", {
            name: "Recomiéndame películas",
        });
        await user.click(enviar);

        expect(await screen.findByRole("status")).toHaveTextContent(
            "No se pudieron consultar las funciones. Intenta nuevamente.",
        );
        expect(enviar).toBeEnabled();
    });
});

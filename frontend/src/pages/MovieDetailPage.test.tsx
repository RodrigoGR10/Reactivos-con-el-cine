// @vitest-environment jsdom
import { HeadlessMantineProvider } from "@mantine/core";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { FavoritesProvider } from "../context/FavoritesContext";
import cineService from "../services/cines";
import funcionesService, {
    type EventoDetalleStream,
} from "../services/funciones";
import peliculaService from "../services/peliculas";
import type { Horario } from "../types/types";
import MovieDetailPage from "./MovieDetailPage";

vi.mock("../services/authService", () => ({
    default: { getCurrentUser: async () => null },
}));
vi.mock("../services/cines", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../services/funciones", () => ({
    default: { getHorarios: vi.fn(), streamDetalle: vi.fn() },
}));
vi.mock("../services/peliculas", () => ({ default: { getById: vi.fn() } }));

const primerDia = "2035-07-17";
const segundoDia = "2035-07-18";

function horario(
    id: string,
    cineId: string,
    fecha: string,
    hora: string,
): Horario {
    return {
        id,
        cineId,
        fecha,
        fechaCartelera: fecha,
        horario: hora,
        peliculaId: "1",
        idioma: "Subtitulada",
        sala: "1",
        agotada: false,
        estadoPrecio: "pendiente",
        tarifas: [],
    };
}

function renderDetalle(busqueda = "") {
    const user = userEvent.setup();
    const router = createMemoryRouter(
        [
            {
                path: "/peliculas/:id",
                element: (
                    <FavoritesProvider>
                        <MovieDetailPage />
                    </FavoritesProvider>
                ),
            },
        ],
        { initialEntries: [`/peliculas/1${busqueda}`] },
    );
    render(
        <HeadlessMantineProvider env="test">
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </HeadlessMantineProvider>,
    );
    return { router, user };
}

beforeEach(() => {
    vi.mocked(peliculaService.getById).mockResolvedValue({
        id: "1",
        titulo: "Órbita",
        duracion: 100,
        genero: "Drama",
        clasificacion: "TE",
        sinopsis: "",
        poster: "",
    });
    vi.mocked(cineService.getAll).mockResolvedValue([
        { id: "alameda", nombre: "Cine Alameda", comuna: "Santiago" },
        { id: "plaza", nombre: "Cine Plaza", comuna: "Providencia" },
    ]);
});

describe("Horarios en el detalle de película", () => {
    beforeEach(() => {
        vi.mocked(funcionesService.getHorarios).mockResolvedValue([
            horario("3", "plaza", segundoDia, "21:00"),
            horario("1", "alameda", primerDia, "15:30"),
            horario("2", "alameda", primerDia, "18:00"),
        ]);
    });

    it("agrupa los horarios por cine y actualiza la URL al cambiar de fecha", async () => {
        const { router, user } = renderDetalle(
            "?fecha=2035-07-01&funcionId=1&hora=15%3A30",
        );
        await screen.findByRole("link", { name: "Cine Alameda" });
        const funciones = within(
            screen.getByRole("region", { name: "Funciones" }),
        );
        const grupoAlameda = within(funciones.getByRole("article"));

        expect(
            grupoAlameda.getByRole("link", { name: "Cine Alameda" }),
        ).toBeVisible();
        expect(grupoAlameda.getByText("15:30")).toBeVisible();
        expect(grupoAlameda.getByText("18:00")).toBeVisible();
        expect(funciones.queryByText("21:00")).not.toBeInTheDocument();

        await user.click(funciones.getByRole("tab", { selected: false }));

        expect(
            funciones.getByRole("link", { name: "Cine Plaza" }),
        ).toBeVisible();
        expect(funciones.getByText("21:00")).toBeVisible();
        expect(
            funciones.queryByRole("link", { name: "Cine Alameda" }),
        ).not.toBeInTheDocument();
        expect(funciones.queryByText("15:30")).not.toBeInTheDocument();
        expect(router.state.location.search).toBe(`?fecha=${segundoDia}`);
    });

    it("muestra el aviso de funciones vacías cuando no hay horarios", async () => {
        vi.mocked(funcionesService.getHorarios).mockResolvedValueOnce([]);
        renderDetalle();

        expect(
            await screen.findByText(
                "No hay funciones vigentes para esta fecha.",
            ),
        ).toBeVisible();
        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });
});

describe("Respuestas parciales del detalle de una función", () => {
    it.each([
        {
            llega: "precio",
            datoVisible: /\$\s*4[.\s]?500/,
            datoAusente: "12 libres",
            aviso: "Butacas no disponibles",
        },
        {
            llega: "butaca",
            datoVisible: "12 libres",
            datoAusente: /\$\s*4[.\s]?500/,
            aviso: "Precio no disponible",
        },
    ] as const)(
        "muestra el dato de $llega antes del cierre y lo conserva ante un fallo parcial",
        async ({ llega, datoVisible, datoAusente, aviso }) => {
            const base = horario("1", "alameda", primerDia, "15:30");
            vi.mocked(funcionesService.getHorarios).mockResolvedValue([base]);

            let emitir!: (evento: EventoDetalleStream) => void;
            let cerrar!: () => void;
            vi.mocked(funcionesService.streamDetalle).mockImplementationOnce(
                (_peliculaId, _cineId, _fecha, onEvento) => {
                    emitir = onEvento;
                    return new Promise<void>((resolve) => {
                        cerrar = resolve;
                    });
                },
            );

            const { user } = renderDetalle();
            const consultar = await screen.findByRole("button", {
                name: "Consultar detalle para Cine Alameda",
            });
            await user.click(consultar);
            expect(consultar).toBeDisabled();
            expect(consultar).toHaveAttribute("aria-busy", "true");

            const consultadoEn = new Date().toISOString();
            const evento: EventoDetalleStream =
                llega === "precio"
                    ? {
                          tipo: "precio",
                          horario: {
                              ...base,
                              estadoPrecio: "disponible",
                              preciosConsultadosEn: consultadoEn,
                              tarifas: [
                                  {
                                      id: "tarifa-1",
                                      peliculaId: base.peliculaId,
                                      cineId: base.cineId,
                                      horario: base.horario,
                                      formato: "2D",
                                      idioma: base.idioma,
                                      precio: 4500,
                                  },
                              ],
                          },
                      }
                    : {
                          tipo: "butaca",
                          horario: {
                              ...base,
                              estadoButacas: "disponible",
                              butacas: {
                                  disponibles: 12,
                                  consultadasEn: consultadoEn,
                              },
                          },
                      };
            await act(() => emitir(evento));

            expect(screen.getByText(datoVisible)).toBeVisible();
            expect(consultar).toHaveAttribute("aria-busy", "true");

            await act(() => {
                emitir({
                    tipo: "fin",
                    falloPrecios: llega === "butaca",
                    falloButacas: llega === "precio",
                });
                cerrar();
            });

            expect(screen.getByRole("alert")).toHaveTextContent(aviso);
            expect(screen.getByText(datoVisible)).toBeVisible();
            expect(screen.queryByText(datoAusente)).not.toBeInTheDocument();
            expect(consultar).not.toHaveAttribute("aria-busy");
        },
    );
});

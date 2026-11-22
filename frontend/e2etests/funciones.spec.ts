
import { expect, test, type Page, type Response } from "@playwright/test";

const timeoutStream = { timeout: 15_000 };

type EventoDetalle = {
    tipo: "precio" | "butaca" | "fin";
    horario?: {
        id: string;
        tarifas?: Array<{ precio?: number; precioOnline?: number }>;
        butacas?: {
            disponibles?: number;
            total?: number;
        };
        estadoPrecio?: string;
        estadoButacas?: string;
    };
    falloPrecios?: boolean;
    falloButacas?: boolean;
};

async function consultarDetalle(
    page: Page,
    pelicula: string,
): Promise<{ respuesta: Response; eventos: EventoDetalle[] }> {
    const boton = page.getByRole("button", {
        name: `Consultar detalle para ${pelicula}`,
    });

    await expect(boton).toBeVisible();
    await expect(boton).toBeEnabled();

    const [respuesta] = await Promise.all([
        page.waitForResponse((response) => {
            const url = new URL(response.url());
            return (
                url.pathname === "/api/funciones/detalle-stream" &&
                response.request().method() === "GET"
            );
        }),
        boton.click(),
    ]);

    expect(
        respuesta.status(),
        "El endpoint de detalle debe responder correctamente.",
    ).toBe(200);

    // Espera a que el stream NDJSON termine, no solo a sus cabeceras.
    await respuesta.finished();

    const cuerpo = await respuesta.body();
    const texto = cuerpo.toString("utf-8").trim();

    expect(texto, "El stream de detalle no debe estar vacío.").not.toBe("");

    const eventos = texto
        .split("\n")
        .filter((linea) => linea.trim().length > 0)
        .map((linea) => JSON.parse(linea) as EventoDetalle);

    expect(
        eventos.some((evento) => evento.tipo === "fin"),
        "El stream debe terminar con un evento fin.",
    ).toBe(true);

    return { respuesta, eventos };
}

test("consulta precios y butacas para una fecha desde el detalle del cine", async ({
    page,
}) => {
    // Supera el cooldown de cinco minutos usado por la interfaz.
    await page.clock.setFixedTime(new Date(Date.now() + 6 * 60_000));

    await page.goto("/cines");

    await expect(
        page.getByRole("link", { name: "Cine Plaza", exact: true }),
    ).toBeVisible();

    await page.getByRole("searchbox", { name: "Buscar cines" }).fill("Alameda");

    await expect(
        page.getByRole("link", { name: "Cine Plaza", exact: true }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: "Cine Alameda", exact: true }).click();

    await expect(
        page.getByRole("heading", { name: "Cine Alameda" }),
    ).toBeVisible();

    const fechas = page
        .getByRole("tablist", { name: "Seleccionar fecha de funciones" })
        .getByRole("tab");

    await expect(fechas).toHaveCount(2);

    const ultimaFecha = fechas.last();
    await ultimaFecha.click();

    await expect(ultimaFecha).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("20:00", { exact: true })).toBeVisible();

    const { eventos } = await consultarDetalle(page, "Órbita Austral");

    // Comprueba que el backend realmente envió los datos esperados.
    expect(
        eventos.some(
            (evento) =>
                evento.tipo === "precio" &&
                evento.horario?.tarifas?.some(
                    (tarifa) => tarifa.precio === 4500,
                ),
        ),
        "El stream debe incluir el precio de $4.500.",
    ).toBe(true);

    expect(
        eventos.some(
            (evento) =>
                evento.tipo === "butaca" &&
                evento.horario?.butacas?.disponibles === 80,
        ),
        "El stream debe incluir 80 butacas disponibles.",
    ).toBe(true);

    // Comprueba además que los datos llegaron a la interfaz.
    await expect(
        page.getByText(/\$\s*4[.\s]?500/),
    ).toBeVisible(timeoutStream);

    await expect(
        page.getByText(/80\s+libres/),
    ).toBeVisible(timeoutStream);
});

const fallosParciales = [
    {
        cine: "Cine Alameda",
        pelicula: "Órbita Austral",
        aviso: "Precio no disponible",
        datoDisponible: /80\s+libres/,
        datoAusente: /\$\s*4[.\s]?500/,
        tipoDato: "butaca" as const,
    },
    {
        cine: "Cine Plaza",
        pelicula: "El viaje del sur",
        aviso: "Butacas no disponibles",
        datoDisponible: /\$\s*4[.\s]?500/,
        datoAusente: /80\s+libres/,
        tipoDato: "precio" as const,
    },
];

for (const {
    cine,
    pelicula,
    aviso,
    datoDisponible,
    datoAusente,
    tipoDato,
} of fallosParciales) {
    test(
        `conserva el detalle disponible cuando aparece el aviso «${aviso}»`,
        async ({ page }) => {
            await page.clock.setFixedTime(
                new Date(Date.now() + 6 * 60_000),
            );

            await page.goto("/cines");

            await page
                .getByRole("link", { name: cine, exact: true })
                .click();

            const { eventos } = await consultarDetalle(page, pelicula);

            // El dato que sí funciona debe venir realmente en el stream.
            expect(
                eventos.some((evento) => evento.tipo === tipoDato),
                `El stream debe incluir un evento de tipo ${tipoDato}.`,
            ).toBe(true);

            // Esperamos a que termine la consulta antes de revisar el aviso.
            await expect(page.getByRole("alert")).toHaveText(
                aviso,
                timeoutStream,
            );

            await expect(
                page.getByText(datoDisponible),
            ).toBeVisible(timeoutStream);

            // El dato del proveedor que falló no debe mostrarse como válido.
            await expect(
                page.getByText(datoAusente),
            ).toHaveCount(0);
        },
    );
}

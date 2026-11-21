import { expect, test } from "@playwright/test";

test("consulta precios y butacas para una fecha desde el detalle del cine", async ({
    page,
}) => {
    // El navegador supera su cooldown de cinco minutos, con PostgreSQL aún en caché.
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

    const [stream] = await Promise.all([
        page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname ===
                "/api/funciones/detalle-stream",
        ),
        page
            .getByRole("button", {
                name: "Consultar detalle para Órbita Austral",
            })
            .click(),
    ]);
    expect(stream.ok()).toBe(true);
    await expect(page.getByText(/\$\s*4[.\s]?500/)).toBeVisible();
    await expect(page.getByText("80 libres")).toBeVisible();
});

const fallosParciales = [
    {
        cine: "Cine Alameda",
        pelicula: "Órbita Austral",
        aviso: "Precio no disponible",
        datoDisponible: "80 libres",
        datoAusente: /\$\s*4[.\s]?500/,
    },
    {
        cine: "Cine Plaza",
        pelicula: "El viaje del sur",
        aviso: "Butacas no disponibles",
        datoDisponible: /\$\s*4[.\s]?500/,
        datoAusente: "80 libres",
    },
];

for (const {
    cine,
    pelicula,
    aviso,
    datoDisponible,
    datoAusente,
} of fallosParciales) {
    test(`conserva el detalle disponible cuando aparece el aviso «${aviso}»`, async ({
        page,
    }) => {
        await page.clock.setFixedTime(new Date(Date.now() + 6 * 60_000));
        await page.goto("/cines");
        await page.getByRole("link", { name: cine, exact: true }).click();

        await page
            .getByRole("button", { name: `Consultar detalle para ${pelicula}` })
            .click();
        await expect(page.getByRole("alert")).toHaveText(aviso);
        await expect(
            page.getByText(datoDisponible, { exact: true }),
        ).toBeVisible();
        await expect(page.getByText(datoAusente, { exact: true })).toHaveCount(
            0,
        );
    });
}

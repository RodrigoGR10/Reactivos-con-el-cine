import { expect, test, type Locator, type Page } from "@playwright/test";

function fechaChileDentroDe(dias: number) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(Date.now() + dias * 86_400_000));
}

async function recomendarPorComuna(
    page: Page,
    recomendador: Locator,
    comuna: string,
) {
    await recomendador
        .getByRole("button", { name: /seleccionar comuna/i })
        .click();
    await page.getByRole("option", { name: comuna, exact: true }).click();
    await recomendador
        .getByRole("button", { name: "Recomiéndame películas" })
        .click();
}

test("recomienda una película para la comuna y hora elegidas", async ({
    page,
}) => {
    const manana = fechaChileDentroDe(1);

    await page.goto("/");
    const recomendador = page.getByRole("region", {
        name: "Encuentra una película al azar",
    });
    await recomendador.getByLabel("Día", { exact: true }).fill(manana);
    await recomendador.getByLabel("Hora desde", { exact: true }).fill("15:00");
    await recomendarPorComuna(page, recomendador, "Santiago");

    const resultados = recomendador.getByRole("link", {
        name: /ver detalles de/i,
    });
    await expect(resultados).toHaveCount(1);
    await expect(resultados).toHaveAccessibleName(/Órbita Austral/);
    await resultados.click();
    await expect(page).toHaveURL(
        new RegExp(`/peliculas/\\d+\\?fecha=${manana}`),
    );
    await expect(
        page.getByRole("heading", { name: "Órbita Austral" }),
    ).toBeVisible();
});

test.describe("medianoche en Chile", () => {
    test.use({ timezoneId: "UTC" });

    test("recomienda y abre una función del día siguiente desde una búsqueda nocturna", async ({
        page,
    }) => {
        const fechaBusqueda = fechaChileDentroDe(1);
        const fechaFuncion = fechaChileDentroDe(2);
        const offsetChile = new Intl.DateTimeFormat("en", {
            timeZone: "America/Santiago",
            timeZoneName: "longOffset",
        })
            .formatToParts(new Date(`${fechaBusqueda}T12:00:00Z`))
            .find(({ type }) => type === "timeZoneName")
            ?.value.replace("GMT", "");

        await page.clock.setFixedTime(
            new Date(`${fechaBusqueda}T23:30:01${offsetChile}`),
        );
        await page.goto("/");
        const recomendador = page.getByRole("region", {
            name: "Encuentra una película al azar",
        });
        await expect(
            recomendador.getByLabel("Día", { exact: true }),
        ).toHaveValue(fechaBusqueda);
        await expect(
            recomendador.getByLabel("Hora desde", { exact: true }),
        ).toHaveValue("23:45");
        await recomendarPorComuna(page, recomendador, "Providencia");

        const funcion = recomendador.getByRole("link", {
            name: /ver detalles de El viaje del sur.*00:15/i,
        });
        await expect(funcion.locator("time")).toHaveAttribute(
            "datetime",
            `${fechaFuncion}T00:15:00`,
        );
        await funcion.click();
        await expect(page).toHaveURL(
            new RegExp(`/peliculas/\\d+\\?fecha=${fechaFuncion}`),
        );
        await expect(page.getByText("00:15", { exact: true })).toBeVisible();
        const fechas = page.getByRole("tablist", {
            name: "Seleccionar fecha de funciones",
        });
        const hoy = fechas.getByRole("tab", { name: "HOY", exact: true });
        await expect(hoy).toHaveAttribute("aria-selected", "false");

        await page.clock.setFixedTime(
            new Date(`${fechaFuncion}T00:01:00${offsetChile}`),
        );
        await page.reload();
        await expect(hoy).toHaveAttribute("aria-selected", "true");
        await expect(page.getByText("00:15", { exact: true })).toBeVisible();
    });
});

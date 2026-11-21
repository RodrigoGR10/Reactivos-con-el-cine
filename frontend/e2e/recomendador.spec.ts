import { expect, test } from "@playwright/test";

test("recomienda una película para la comuna y hora elegidas", async ({
    page,
}) => {
    const manana = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(Date.now() + 86_400_000));

    await page.goto("/");
    const recomendador = page.getByRole("region", {
        name: "Encuentra una película al azar",
    });
    await recomendador.getByLabel("Día", { exact: true }).fill(manana);
    await recomendador.getByLabel("Hora desde", { exact: true }).fill("15:00");
    await recomendador
        .getByRole("button", { name: /seleccionar comuna/i })
        .click();
    await page.getByRole("option", { name: "Santiago", exact: true }).click();
    await recomendador
        .getByRole("button", { name: "Recomiéndame películas" })
        .click();

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

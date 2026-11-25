import { expect, test } from "@playwright/test";

test("busca y filtra la cartelera antes de abrir una película", async ({
    page,
}) => {
    await page.goto("/");
    const cartelera = page.getByRole("region", { name: "Cartelera" });
    const orbita = cartelera.getByRole("link", { name: "Órbita Austral" });
    const viaje = cartelera.getByRole("link", { name: "El viaje del sur" });
    await expect(viaje).toBeVisible();

    const buscador = page.getByRole("searchbox", {
        name: "Buscar una película",
    });
    await buscador.fill("orbita");
    await expect(orbita).toBeVisible();
    await expect(viaje).toHaveCount(0);
    await buscador.clear();
    await expect(viaje).toBeVisible();

    await page.getByRole("button", { name: /filtrar por géneros/i }).click();
    await page.getByRole("checkbox", { name: "Drama" }).click();
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await expect(orbita).toBeVisible();
    await expect(viaje).toHaveCount(0);

    await orbita.click();
    await expect(page).toHaveURL(/\/peliculas\/\d+/);
    await expect(
        page.getByRole("heading", { name: "Órbita Austral" }),
    ).toBeVisible();
});

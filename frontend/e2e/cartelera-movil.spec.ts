import { expect, test } from "@playwright/test";

test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
});

test("aplica filtros desde el panel móvil y abre el resultado", async ({
    page,
}) => {
    await page.goto("/");
    const cartelera = page.getByRole("region", { name: "Cartelera" });
    const viaje = cartelera.getByRole("link", { name: "El viaje del sur" });
    await expect(viaje).toBeVisible();

    await page.getByRole("button", { name: "Abrir filtros" }).tap();
    const panel = page.getByRole("dialog").filter({
        has: page.getByRole("button", { name: "Cerrar filtros" }),
    });
    await panel.getByRole("button", { name: "Géneros", exact: true }).tap();
    await panel.getByRole("checkbox", { name: "Drama", exact: true }).tap();
    await panel.getByRole("button", { name: "Listo", exact: true }).tap();

    await expect(panel).toBeHidden();
    await expect(viaje).toHaveCount(0);
    await cartelera.getByRole("link", { name: "Órbita Austral" }).tap();
    await expect(
        page.getByRole("heading", { name: "Órbita Austral" }),
    ).toBeVisible();
});

import { expect, test, type Locator } from "@playwright/test";

test.use({
    viewport: { width: 390, height: 844 },
    isMobile: ({ browserName }, setOption) =>
        setOption(browserName !== "firefox"),
    hasTouch: ({ browserName }, setOption) =>
        setOption(browserName !== "firefox"),
});

test("aplica filtros desde el panel móvil y abre el resultado", async ({
    browserName,
    page,
}) => {
    const activar = (control: Locator) =>
        browserName === "firefox" ? control.click() : control.tap();

    await page.goto("/");
    const cartelera = page.getByRole("region", { name: "Cartelera" });
    const viaje = cartelera.getByRole("link", { name: "El viaje del sur" });
    await expect(viaje).toBeVisible();

    await activar(page.getByRole("button", { name: "Abrir filtros" }));
    const panel = page.getByRole("dialog").filter({
        has: page.getByRole("button", { name: "Cerrar filtros" }),
    });
    await activar(panel.getByRole("button", { name: "Géneros", exact: true }));
    await activar(panel.getByRole("checkbox", { name: "Drama", exact: true }));
    await activar(panel.getByRole("button", { name: "Listo", exact: true }));

    await expect(panel).toBeHidden();
    await expect(viaje).toHaveCount(0);
    await activar(cartelera.getByRole("link", { name: "Órbita Austral" }));
    await expect(
        page.getByRole("heading", { name: "Órbita Austral" }),
    ).toBeVisible();
});

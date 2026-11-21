import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";

const contrasena = "Cartelera123";

async function cambiarFavorito(
    page: Page,
    tipo: "peliculas" | "cines",
    boton: Locator,
) {
    const [respuesta] = await Promise.all([
        page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname.startsWith(
                    `/api/perfil/favoritos/${tipo}/`,
                ),
        ),
        boton.click(),
    ]);
    expect(respuesta.ok()).toBe(true);
}

test("protege el perfil, restaura la sesión registrada y cierra sesión", async ({
    page,
}) => {
    const nombre = "Persona de prueba";
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/login$/);

    const dialogo = page.getByRole("dialog");
    await dialogo.getByRole("link", { name: "Regístrate" }).click();
    const registrar = page.getByRole("button", {
        name: "Registrarse",
        exact: true,
    });
    const formulario = dialogo.locator("form").filter({ has: registrar });
    await formulario.getByLabel("Usuario", { exact: true }).fill(nombre);
    await formulario
        .getByLabel("Correo Electrónico", { exact: true })
        .fill(`e2e-${randomUUID()}@example.com`);
    await formulario.getByLabel("Contraseña", { exact: true }).fill(contrasena);
    await formulario
        .getByLabel("Confirmar Contraseña", { exact: true })
        .fill(contrasena);
    await registrar.click();

    await expect(page).toHaveURL(/\/perfil$/);
    const perfil = page.getByRole("heading", { name: nombre });
    await expect(perfil).toBeVisible();
    await page.reload();
    await expect(perfil).toBeVisible();

    await page
        .getByRole("button", { name: "Cerrar sesión", exact: true })
        .click();
    await page
        .getByRole("dialog", { name: "¿Cerrar sesión?" })
        .getByRole("button", { name: "Cerrar sesión", exact: true })
        .click();
    await expect(
        page.getByRole("button", { name: "Cerrar sesión", exact: true }),
    ).toHaveCount(0);
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/login$/);
});

test("inicia sesión y conserva películas y cines guardados hasta eliminarlos", async ({
    page,
    request,
}) => {
    const email = `e2e-${randomUUID()}@example.com`;
    const alta = await request.post("/api/auth/register", {
        data: { nombre: "Persona con favoritos", email, contrasena },
    });
    expect(alta.ok()).toBe(true);

    await page.goto("/login");
    const dialogo = page.getByRole("dialog");
    const iniciarSesion = page.getByRole("button", {
        name: "Iniciar Sesión",
        exact: true,
    });
    const formulario = dialogo.locator("form").filter({ has: iniciarSesion });
    await formulario
        .getByLabel("Correo Electrónico", { exact: true })
        .fill(email);
    await formulario.getByLabel("Contraseña", { exact: true }).fill(contrasena);
    await formulario
        .getByRole("button", { name: "Iniciar Sesión", exact: true })
        .click();
    await expect(page).toHaveURL(/\/perfil$/);

    await page.goto("/");
    await page
        .getByRole("region", { name: "Cartelera" })
        .getByRole("link", { name: "Órbita Austral" })
        .click();
    await cambiarFavorito(
        page,
        "peliculas",
        page.getByRole("button", {
            name: "Guardar Órbita Austral en Mi lista",
            exact: true,
        }),
    );
    await expect(
        page.getByRole("button", { name: "Quitar Órbita Austral de Mi lista" }),
    ).toBeVisible();

    await page.goto("/cines");
    await page.getByRole("link", { name: "Cine Alameda", exact: true }).click();
    await cambiarFavorito(
        page,
        "cines",
        page.getByRole("button", {
            name: "Guardar Cine Alameda en cines habituales",
            exact: true,
        }),
    );
    await expect(
        page.getByRole("button", {
            name: "Quitar Cine Alameda de cines habituales",
        }),
    ).toBeVisible();

    await page.goto("/perfil");
    await expect(
        page.getByRole("link", { name: "Órbita Austral", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
        page.getByRole("link", { name: "Órbita Austral", exact: true }),
    ).toBeVisible();
    const editar = page.getByRole("button", { name: "Editar guardados" });
    await editar.click();
    await cambiarFavorito(
        page,
        "peliculas",
        page.getByRole("button", {
            name: "Eliminar Órbita Austral de mis películas",
            exact: true,
        }),
    );
    await expect(
        page.getByRole("heading", { name: "tu lista de películas está vacía" }),
    ).toBeVisible();

    const cines = page.getByRole("button", {
        name: "cines habituales",
        exact: true,
    });
    await cines.click();
    await expect(
        page.getByRole("link", { name: "Cine Alameda", exact: true }),
    ).toBeVisible();
    await editar.click();
    await cambiarFavorito(
        page,
        "cines",
        page.getByRole("button", {
            name: "eliminar Cine Alameda",
            exact: true,
        }),
    );
    await expect(
        page.getByRole("heading", { name: "no tienes cines guardados" }),
    ).toBeVisible();

    await page.reload();
    await expect(
        page.getByRole("heading", { name: "tu lista de películas está vacía" }),
    ).toBeVisible();
    await cines.click();
    await expect(
        page.getByRole("heading", { name: "no tienes cines guardados" }),
    ).toBeVisible();
});

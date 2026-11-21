// @vitest-environment jsdom
import { HeadlessMantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoginInput } from "../../types/auth";
import { LoginForm } from "./LoginForm";

const { login } = vi.hoisted(() => ({
    login: vi.fn<(credenciales: LoginInput) => Promise<void>>(),
}));

vi.mock("../../context/AuthContext", () => ({
    useAuth: () => ({ login }),
}));

function renderLogin() {
    const user = userEvent.setup();
    const onCloseProgramado = vi.fn();
    render(
        <LoginForm
            activo
            onCloseProgramado={onCloseProgramado}
            onSwitchView={vi.fn()}
        />,
        { wrapper: HeadlessMantineProvider },
    );
    return { user, onCloseProgramado };
}

async function ingresarCredenciales(user: ReturnType<typeof userEvent.setup>) {
    await user.type(
        screen.getByRole("textbox", { name: "Correo Electrónico" }),
        "cine@example.com",
    );
    await user.type(screen.getByLabelText("Contraseña"), "clave123");
}

describe("LoginForm", () => {
    beforeEach(() => {
        login.mockReset().mockResolvedValue(undefined);
    });

    it("muestra un error y evita el envío si el correo es inválido", async () => {
        const { user } = renderLogin();
        await user.type(
            screen.getByRole("textbox", { name: "Correo Electrónico" }),
            "correo-invalido",
        );
        await user.click(
            screen.getByRole("button", { name: "Iniciar Sesión" }),
        );

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Ingresa un correo electrónico válido.",
        );
        expect(login).not.toHaveBeenCalled();
    });

    it("envía las credenciales y solicita el cierre al iniciar sesión", async () => {
        const { user, onCloseProgramado } = renderLogin();
        await ingresarCredenciales(user);
        await user.click(
            screen.getByRole("button", { name: "Iniciar Sesión" }),
        );

        expect(login).toHaveBeenCalledExactlyOnceWith({
            email: "cine@example.com",
            contrasena: "clave123",
        });
        expect(
            await screen.findByText("¡Sesión iniciada con éxito!"),
        ).toBeVisible();
        expect(onCloseProgramado).toHaveBeenCalledTimes(1);
    });

    it("permite reintentar tras un rechazo de autenticación", async () => {
        login.mockRejectedValueOnce(new Error("Credenciales incorrectas."));
        const { user, onCloseProgramado } = renderLogin();
        await ingresarCredenciales(user);
        await user.click(
            screen.getByRole("button", { name: "Iniciar Sesión" }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Credenciales incorrectas.",
        );
        expect(onCloseProgramado).not.toHaveBeenCalled();

        await user.click(
            screen.getByRole("button", { name: "Iniciar Sesión" }),
        );

        expect(
            await screen.findByText("¡Sesión iniciada con éxito!"),
        ).toBeVisible();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(login).toHaveBeenCalledTimes(2);
    });
});

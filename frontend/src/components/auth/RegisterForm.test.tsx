// @vitest-environment jsdom
import { HeadlessMantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterInput } from "../../types/auth";
import { RegisterForm } from "./RegisterForm";

const { register } = vi.hoisted(() => ({
    register: vi.fn<(datos: RegisterInput) => Promise<void>>(),
}));

vi.mock("../../context/AuthContext", () => ({
    useAuth: () => ({ register }),
}));

function renderRegistro() {
    const user = userEvent.setup();
    const onCloseProgramado = vi.fn();
    render(
        <RegisterForm
            activo
            onCloseProgramado={onCloseProgramado}
            onSwitchView={vi.fn()}
        />,
        { wrapper: HeadlessMantineProvider },
    );
    return { user, onCloseProgramado };
}

async function completarRegistro(
    user: ReturnType<typeof userEvent.setup>,
    confirmacion = "clave123",
) {
    await user.type(screen.getByRole("textbox", { name: "Usuario" }), " Ana ");
    await user.type(
        screen.getByRole("textbox", { name: "Correo Electrónico" }),
        "ana@example.com",
    );
    await user.type(screen.getByLabelText("Contraseña"), "clave123");
    await user.type(
        screen.getByLabelText("Confirmar Contraseña"),
        confirmacion,
    );
    await user.click(screen.getByRole("button", { name: "Registrarse" }));
}

describe("RegisterForm", () => {
    beforeEach(() => {
        register.mockReset().mockResolvedValue(undefined);
    });

    it("bloquea el registro si la confirmación no coincide", async () => {
        const { user } = renderRegistro();
        await completarRegistro(user, "otra-clave");

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Las contraseñas no coinciden.",
        );
        expect(register).not.toHaveBeenCalled();
    });

    it("envía los datos válidos y solicita el cierre tras crear la cuenta", async () => {
        const { user, onCloseProgramado } = renderRegistro();
        await completarRegistro(user);

        expect(register).toHaveBeenCalledExactlyOnceWith({
            nombre: "Ana",
            email: "ana@example.com",
            contrasena: "clave123",
            confirmarContrasena: "clave123",
        });
        expect(
            await screen.findByText("¡Cuenta creada e iniciada con éxito!"),
        ).toBeVisible();
        expect(onCloseProgramado).toHaveBeenCalledTimes(1);
    });

    it("muestra el error y permite volver a enviar tras un rechazo", async () => {
        register.mockRejectedValueOnce(
            new Error("El correo ya está registrado."),
        );
        const { user, onCloseProgramado } = renderRegistro();
        await completarRegistro(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "El correo ya está registrado.",
        );
        expect(
            screen.getByRole("button", { name: "Registrarse" }),
        ).toBeEnabled();
        expect(onCloseProgramado).not.toHaveBeenCalled();
    });
});

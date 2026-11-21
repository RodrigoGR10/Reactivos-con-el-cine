import { useState, type SubmitEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { MailIcon } from "../common/Icons";
import { AuthAlert } from "./AuthAlert";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { AuthTextField } from "./AuthTextField";
import { validarCredenciales } from "./validacionAuth";

interface LoginFormProps {
    activo: boolean;
    /** Pide al contenedor que cierre el modal tras el breve delay de éxito. */
    onCloseProgramado: () => void;
    onSwitchView: (toRegister: boolean) => void;
    onSuccess?: () => void;
}

export const LoginForm = ({
    activo,
    onCloseProgramado,
    onSwitchView,
    onSuccess,
}: LoginFormProps) => {
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    // Al ocultarse la vista se limpian los mensajes, igual que al alternar vistas.
    const [activoPrevio, setActivoPrevio] = useState(activo);
    if (activoPrevio !== activo) {
        setActivoPrevio(activo);
        setErrorMsg(null);
        setSuccessMsg(null);
    }

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        if (cargando || successMsg) return;
        setErrorMsg(null);
        setSuccessMsg(null);

        const error = validarCredenciales({ email, contrasena });
        if (error) {
            setErrorMsg(error);
            return;
        }

        setCargando(true);
        try {
            await login({ email: email.trim(), contrasena });
            if (onSuccess) {
                onSuccess();
                return;
            }
            setSuccessMsg("¡Sesión iniciada con éxito!");
            onCloseProgramado();
        } catch (err) {
            setErrorMsg(
                err instanceof Error ? err.message : "Error al iniciar sesión.",
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="auth-form-box login" inert={!activo}>
            <h2>Iniciar Sesión</h2>

            {errorMsg && activo && (
                <AuthAlert tipo="error" mensaje={errorMsg} />
            )}
            {successMsg && activo && (
                <AuthAlert tipo="success" mensaje={successMsg} />
            )}

            <form onSubmit={handleSubmit} noValidate>
                <AuthTextField
                    id="login-email"
                    label="Correo Electrónico"
                    type="email"
                    autoComplete="username"
                    autoFocus={activo}
                    icon={<MailIcon size={18} />}
                    value={email}
                    onChange={(valor) => {
                        setEmail(valor);
                        setErrorMsg(null);
                    }}
                />

                <AuthTextField
                    id="login-password"
                    label="Contraseña"
                    type="password"
                    autoComplete="current-password"
                    value={contrasena}
                    onChange={(valor) => {
                        setContrasena(valor);
                        setErrorMsg(null);
                    }}
                />

                <AuthSubmitButton
                    etiqueta="Iniciar Sesión"
                    etiquetaCargando="Ingresando..."
                    cargando={cargando}
                    deshabilitado={Boolean(successMsg)}
                />

                <div className="auth-switch-link">
                    <p>
                        ¿No tienes una cuenta?{" "}
                        <a
                            href="#register"
                            onClick={(e) => {
                                e.preventDefault();
                                onSwitchView(true);
                            }}
                        >
                            Regístrate
                        </a>
                    </p>
                </div>
            </form>
        </div>
    );
};

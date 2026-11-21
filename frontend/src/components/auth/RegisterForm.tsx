import { useState, type SubmitEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { MailIcon, PersonIcon } from "../common/Icons";
import { AuthAlert } from "./AuthAlert";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { AuthTextField } from "./AuthTextField";
import { validarRegistro } from "./validacionAuth";

interface RegisterFormProps {
    activo: boolean;
    /** Pide al contenedor que cierre el modal tras el breve delay de éxito. */
    onCloseProgramado: () => void;
    onSwitchView: (toRegister: boolean) => void;
    onSuccess?: () => void;
}

const ETIQUETAS_ALTERNAR_CONFIRMACION = {
    ver: "Ver confirmación de contraseña",
    ocultar: "Ocultar confirmación de contraseña",
};

export const RegisterForm = ({
    activo,
    onCloseProgramado,
    onSwitchView,
    onSuccess,
}: RegisterFormProps) => {
    const { register } = useAuth();

    const [usuario, setUsuario] = useState("");
    const [email, setEmail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
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

        const error = validarRegistro({
            usuario,
            email,
            contrasena,
            confirmacion,
        });
        if (error) {
            setErrorMsg(error);
            return;
        }

        setCargando(true);
        try {
            await register({
                nombre: usuario.trim(),
                email: email.trim(),
                contrasena,
                confirmarContrasena: confirmacion,
            });
            if (onSuccess) {
                onSuccess();
                return;
            }
            setSuccessMsg("¡Cuenta creada e iniciada con éxito!");
            onCloseProgramado();
        } catch (err) {
            setErrorMsg(
                err instanceof Error
                    ? err.message
                    : "Error al registrar la cuenta.",
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="auth-form-box register" inert={!activo}>
            <h2>Registrarse</h2>

            {errorMsg && activo && (
                <AuthAlert tipo="error" mensaje={errorMsg} />
            )}
            {successMsg && activo && (
                <AuthAlert tipo="success" mensaje={successMsg} />
            )}

            <form onSubmit={handleSubmit} noValidate>
                <AuthTextField
                    id="register-username"
                    label="Usuario"
                    autoComplete="nickname"
                    autoFocus={activo}
                    icon={<PersonIcon size={18} />}
                    value={usuario}
                    onChange={(valor) => {
                        setUsuario(valor);
                        setErrorMsg(null);
                    }}
                />

                <AuthTextField
                    id="register-email"
                    label="Correo Electrónico"
                    type="email"
                    autoComplete="email"
                    icon={<MailIcon size={18} />}
                    value={email}
                    onChange={(valor) => {
                        setEmail(valor);
                        setErrorMsg(null);
                    }}
                />

                <AuthTextField
                    id="register-password"
                    label="Contraseña"
                    type="password"
                    autoComplete="new-password"
                    value={contrasena}
                    onChange={(valor) => {
                        setContrasena(valor);
                        setErrorMsg(null);
                    }}
                />

                <AuthTextField
                    id="register-confirm-password"
                    label="Confirmar Contraseña"
                    type="password"
                    autoComplete="new-password"
                    etiquetasAlternar={ETIQUETAS_ALTERNAR_CONFIRMACION}
                    value={confirmacion}
                    onChange={(valor) => {
                        setConfirmacion(valor);
                        setErrorMsg(null);
                    }}
                />

                <AuthSubmitButton
                    etiqueta="Registrarse"
                    etiquetaCargando="Registrando..."
                    cargando={cargando}
                    deshabilitado={Boolean(successMsg)}
                />

                <div className="auth-switch-link">
                    <p>
                        ¿Ya tienes una cuenta?{" "}
                        <a
                            href="#login"
                            onClick={(e) => {
                                e.preventDefault();
                                onSwitchView(false);
                            }}
                        >
                            Inicia Sesión
                        </a>
                    </p>
                </div>
            </form>
        </div>
    );
};

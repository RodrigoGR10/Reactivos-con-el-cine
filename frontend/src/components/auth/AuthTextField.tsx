import { useState, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "../common/Icons";

interface EtiquetasAlternar {
    ver: string;
    ocultar: string;
}

interface AuthTextFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    /** Icono decorativo a la izquierda. No se usa en campos de contraseña. */
    icon?: ReactNode;
    type?: "text" | "email" | "password";
    autoComplete?: string;
    autoFocus?: boolean;
    etiquetasAlternar?: EtiquetasAlternar;
}

const ETIQUETAS_ALTERNAR_POR_DEFECTO: EtiquetasAlternar = {
    ver: "Ver contraseña",
    ocultar: "Ocultar contraseña",
};

export const AuthTextField = ({
    id,
    label,
    value,
    onChange,
    icon,
    type = "text",
    autoComplete,
    autoFocus = false,
    etiquetasAlternar = ETIQUETAS_ALTERNAR_POR_DEFECTO,
}: AuthTextFieldProps) => {
    const [mostrarContenido, setMostrarContenido] = useState(false);
    const esContrasena = type === "password";
    const etiquetaAlternar = mostrarContenido
        ? etiquetasAlternar.ocultar
        : etiquetasAlternar.ver;

    const renderIcono = () => {
        if (!esContrasena) {
            return <span className="icon">{icon}</span>;
        }

        return (
            <button
                type="button"
                className="icon auth-btn-toggle-password"
                onClick={() => setMostrarContenido((prev) => !prev)}
                aria-pressed={mostrarContenido}
                aria-label={etiquetaAlternar}
                title={etiquetaAlternar}
            >
                {mostrarContenido ? (
                    <EyeIcon size={19} />
                ) : (
                    <EyeOffIcon size={19} />
                )}
            </button>
        );
    };

    return (
        <div className={`auth-input-box ${value ? "has-value" : ""}`}>
            {renderIcono()}
            <input
                id={id}
                type={esContrasena && mostrarContenido ? "text" : type}
                autoComplete={autoComplete}
                data-autofocus={autoFocus || undefined}
                required
                placeholder=" "
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <label htmlFor={id}>{label}</label>
        </div>
    );
};

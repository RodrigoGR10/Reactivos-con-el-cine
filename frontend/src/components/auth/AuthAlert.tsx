interface AuthAlertProps {
    tipo: "error" | "success";
    mensaje: string;
}

/**
 * Muestra un mensaje de error o de éxito del formulario de autenticación.
 * @param tipo Determina el estilo y el rol accesible del aviso.
 * @param mensaje Texto que se presenta.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export const AuthAlert = ({ tipo, mensaje }: AuthAlertProps) => (
    <div
        className={`auth-alert ${tipo}`}
        role={tipo === "error" ? "alert" : undefined}
    >
        {mensaje}
    </div>
);

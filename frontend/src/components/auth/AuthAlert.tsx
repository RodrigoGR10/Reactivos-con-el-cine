interface AuthAlertProps {
    tipo: "error" | "success";
    mensaje: string;
}

export const AuthAlert = ({ tipo, mensaje }: AuthAlertProps) => (
    <div
        className={`auth-alert ${tipo}`}
        role={tipo === "error" ? "alert" : undefined}
    >
        {mensaje}
    </div>
);

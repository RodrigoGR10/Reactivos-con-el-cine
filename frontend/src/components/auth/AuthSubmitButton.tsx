import { Loader } from "@mantine/core";

interface AuthSubmitButtonProps {
    etiqueta: string;
    etiquetaCargando: string;
    cargando: boolean;
    deshabilitado?: boolean;
}

export const AuthSubmitButton = ({
    etiqueta,
    etiquetaCargando,
    cargando,
    deshabilitado = false,
}: AuthSubmitButtonProps) => (
    <button
        type="submit"
        className="auth-btn-submit"
        disabled={cargando || deshabilitado}
    >
        {cargando ? (
            <>
                <Loader size={16} color="#ffffff" />
                <span>{etiquetaCargando}</span>
            </>
        ) : (
            etiqueta
        )}
    </button>
);

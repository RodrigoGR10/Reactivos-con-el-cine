import { Loader } from "@mantine/core";

interface AuthSubmitButtonProps {
    etiqueta: string;
    etiquetaCargando: string;
    cargando: boolean;
    deshabilitado?: boolean;
}

/**
 * Botón de envío con etiqueta y estado visual de carga.
 * @param etiqueta Texto normal del botón.
 * @param etiquetaCargando Texto mostrado mientras se envía el formulario.
 * @param cargando Si es `true`, bloquea el botón y muestra un indicador.
 * @param deshabilitado Bloqueo adicional opcional por validación del formulario.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
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

import type { Origen } from "../types.ts";

/**
 * Construye el identificador estable de un registro para una fuente de datos.
 * @param value Valor que se valida o normaliza.
 * @param origen Fuente de datos a la que pertenece el registro.
 * @returns Texto normalizado o generado por la operación.
 */
export function sourceId(value: string, origen: Origen): string {
    const prefix = `${origen}:`;

    if (!value.startsWith(prefix)) {
        throw new Error(
            `Identificador ${value} incompatible con el origen ${origen}.`,
        );
    }

    const id = value.slice(prefix.length).trim();

    if (!id) {
        throw new Error(`Identificador de origen vacío: ${value}.`);
    }

    return id;
}

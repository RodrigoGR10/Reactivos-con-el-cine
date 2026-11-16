import type { Origen } from "../types.ts";

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

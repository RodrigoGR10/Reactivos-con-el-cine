/**
 * Precio de una entrada asociado a una función y su formato.
 */
export interface Tarifa {
    id: number;
    cineId: string;
    formato?: string;
    diaSemana?: string;
    precio: number;
    descripcion?: string;
    creadoEn?: Date;
}

/**
 * Datos necesarios para registrar una tarifa de función.
 */
export type CrearTarifaDTO = Omit<Tarifa, "id" | "creadoEn">;

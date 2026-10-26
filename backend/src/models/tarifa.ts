export interface Tarifa {
    id: number;
    cineId: string;
    formato?: string;
    diaSemana?: string;
    precio: number;
    descripcion?: string;
    creadoEn?: Date;
}

export type CrearTarifaDTO = Omit<Tarifa, "id" | "creadoEn">;

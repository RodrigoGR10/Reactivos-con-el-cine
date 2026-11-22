/** Cadenas de cine del proveedor Vista que se pueden consultar: Muvix y Cinestar. */
export type CadenaVista = "muvix" | "cinestar";

/**
 * Respuesta original de un cine recibida desde el proveedor Vista.
 */
export interface Cinema {
    ID: string;
    Name: string;
    Address1: string;
    Address2: string;
    City: string;
    Latitude: string;
    Longitude: string;
    IsGiftStore: boolean;
}

/**
 * Respuesta original de una película recibida desde el proveedor Vista.
 */
export interface Movie {
    OpeningDate?: string;
    NationalOpeningDate?: string;
    ID: string;
    ScheduledFilmId: string;
    CinemaId: string;
    FilmHOPK: string;
    Title: string;
    RunTime: string;
    Rating: string;
    Synopsis: string;
    TrailerUrl?: string;
}

/**
 * Respuesta original de una función recibida desde el proveedor Vista.
 */
export interface Session {
    ID: string;
    CinemaId: string;
    ScheduledFilmId: string;
    SessionId: string;
    Showtime: string;
    SessionBusinessDate: string;
    SessionAttributesNames: string[];
    SeatsAvailable: number;
    AllowTicketSales: boolean;
    SalesChannels: string;
}

/**
 * Grupo de cines asociado a una ubicación del proveedor Vista.
 */
export interface SiteGroup {
    ID: string;
    Name: string;
}
/**
 * Relación entre un grupo de Vista y un cine.
 */
export interface SiteGroupCinemaLink {
    CinemaId: string;
    SiteGroupId: string;
}

/**
 * Plano de butacas devuelto por Vista para una función.
 */
export interface PlanoButacasVista {
    ResponseCode: number;
    SeatLayoutData?: {
        Areas: Array<{
            Number: number;
            NumberOfSeats: number;
            IsAllocatedSeating: boolean;
            Rows: Array<{
                Seats: Array<{
                    Id: string;
                    Status: number;
                    Position: {
                        AreaNumber: number;
                        RowIndex: number;
                        ColumnIndex: number;
                    };
                }>;
            }>;
        }>;
    };
}

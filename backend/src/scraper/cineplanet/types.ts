/**
 * Datos de un cine extraídos desde el proveedor Cineplanet.
 */
export interface Cinema {
    ID: string;
    name: string;
    address: string;
    city: string;
    formattedCinemaName: string;
    latitude?: string;
    longitude?: string;
}

/**
 * Respuesta de película extraída desde la API de Cineplanet.
 */
export interface Movie {
    isPreSale?: boolean;
    isComingSoon?: boolean;
    OpeningDate?: string;
    id: string;
    title: string;
    runTime: number;
    genre: string;
    ratingDescription: string;
    synopsis: string;
    posterUrl: string;
    trailer?: string;
    movieDetailsUrl: string;
    cinemas: {
        cinemaId: string;
        dates: { date: string; sessions: string[] }[];
    }[];
}

/**
 * Respuesta de función extraída desde la API de Cineplanet.
 */
export interface Session {
    id: string;
    sessionId: string;
    showtime: string;
    formats: string[];
    languages: string[];
}

/**
 * Datos normalizados de una tarifa o entrada asociada a una función.
 */
export interface Ticket {
    CinemaId: string;
    TicketTypeCode: string;
    AreaCategoryCode: string;
    Description: string;
    LongDescription?: string;
    PriceInCents: number;
    TotalTicketFeeAmountInCents?: number;
    SalesChannels: string[];
    IsChildOnlyTicket?: boolean;
    IsPackageTicket?: boolean;
    IsRedemptionTicket?: boolean;
    IsComplimentaryTicket?: boolean;
    IsThirdPartyMemberTicket?: boolean;
    IsAvailableForLoyaltyMembersOnly?: boolean;
    IsAvailableAsLoyaltyRecognitionOnly?: boolean;
    LoyaltyRecognitionId?: number | null;
    ThirdPartyMembershipName?: string;
}

/**
 * Datos normalizados de una tarifa o entrada asociada a una función.
 */
export interface Prices {
    ResponseCode: number;
    Tickets: Ticket[];
}

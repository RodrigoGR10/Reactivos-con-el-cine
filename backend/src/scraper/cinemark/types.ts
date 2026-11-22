/**
 * Estructura original de un cine tal como la entrega la API de Cinemark.
 */
export interface RawCinema {
    id: number;
    name: string;
    slug: string;
    address: string;
    city: string;
    latitude?: string;
    longitude?: string;
}

/**
 * Estructura original de una película tal como la entrega la API de Cinemark.
 */
export interface RawMovie {
    status?: string;
    openingDate?: string;
    corporateId: string;
    slug: string;
    title: string;
    runTime: number;
    genres: { name: string }[];
    rating: string;
    synopsis: string;
    posterUrl: string;
    trailerUrl?: string;
}

/**
 * Estructura original de una función tal como la entrega la API de Cinemark.
 */
export interface RawSession {
    corporateId: string;
    theaterId: string;
    theaterRoom: string;
    sessionId: string;
    sessionFormat: string;
    sessionDateTime: string;
    sessionDisplayDate: string;
    language: { name: string };
    occupation?: { availableSeats: number; capacity?: number; status?: string };
}

/**
 * Estructura original de un tipo de entrada de Cinemark.
 */
export interface RawTicket {
    title: string;
    areaCategoryCode: string;
    isPackageTicket?: boolean;
    isBinPromotion?: boolean;
    isThirdPartyMemberTicket?: boolean;
    isPaymentByCreditCardOnly?: boolean;
    partnershipName?: string | null;
    recognitionId?: number | null;
    ticketsQty?: number;
    internalTicketType?: string;
    buyOptions: {
        priceInCents: number;
        totalWithFee: number;
        promoId?: number;
        recogId?: number;
        level?: number;
        type?: number;
    }[];
}

/**
 * Grupo de precios recibido desde la API de Cinemark.
 */
export interface RawPriceGroup {
    title: string;
    tickets: RawTicket[];
}

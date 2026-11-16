export interface Cinema {
    ID: string;
    name: string;
    address: string;
    city: string;
    formattedCinemaName: string;
    latitude?: string;
    longitude?: string;
}

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
    movieDetailsUrl: string;
    cinemas: {
        cinemaId: string;
        dates: { date: string; sessions: string[] }[];
    }[];
}

export interface Session {
    id: string;
    sessionId: string;
    showtime: string;
    formats: string[];
    languages: string[];
}

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

export interface Prices {
    ResponseCode: number;
    Tickets: Ticket[];
}

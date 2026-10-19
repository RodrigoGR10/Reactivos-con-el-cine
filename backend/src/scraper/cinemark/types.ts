export interface RawCinema {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  latitude?: string;
  longitude?: string;
}

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
}

export interface RawSession {
  corporateId: string;
  theaterId: string;
  theaterRoom: string;
  sessionId: string;
  sessionFormat: string;
  sessionDateTime: string;
  sessionDisplayDate: string;
  language: { name: string };
  occupation?: { availableSeats: number };
}

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

export interface RawPriceGroup {
  title: string;
  tickets: RawTicket[];
}

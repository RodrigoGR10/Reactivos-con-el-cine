export type CadenaVista = "muvix" | "cinestar";

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
}

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

export interface SiteGroup { ID: string; Name: string }
export interface SiteGroupCinemaLink { CinemaId: string; SiteGroupId: string }

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
          Position: { AreaNumber: number; RowIndex: number; ColumnIndex: number };
        }>;
      }>;
    }>;
  };
}

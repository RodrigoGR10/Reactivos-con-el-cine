import { configureRequests } from "../http.ts";
import type { CinepolisCinema } from "./types.ts";

export const SITE = "https://cinepolis.com/cl";
export const BUY_SITE = "https://cinepolis.com/cl/horarios";

export const CINES_CINEPOLIS: CinepolisCinema[] = [
  {
    "id": "cinepolis-mallplaza-antofagasta-norte-y-centro-de-chile",
    "vistaId": "714",
    "name": "Cinépolis Mallplaza Antofagasta",
    "slug": "cinepolis-mallplaza-antofagasta-norte-y-centro-de-chile",
    "city": "Mallplaza Antofagasta",
    "comuna": "Mallplaza Antofagasta",
    "address": "Mallplaza Antofagasta, Norte y Centro de Chile",
    "latitude": -23.645135,
    "longitude": -70.40273
  },
  {
    "id": "cinepolis-shopping-quillota-norte-y-centro-de-chile",
    "vistaId": "873",
    "name": "Cinépolis Shopping Quillota",
    "slug": "cinepolis-shopping-quillota-norte-y-centro-de-chile",
    "city": "Shopping Quillota",
    "comuna": "Shopping Quillota",
    "address": "Shopping Quillota, Norte y Centro de Chile",
    "latitude": -32.897407,
    "longitude": -71.243887
  },
  {
    "id": "cinepolis-ovalle-norte-y-centro-de-chile",
    "vistaId": "1230",
    "name": "Cinépolis Ovalle",
    "slug": "cinepolis-ovalle-norte-y-centro-de-chile",
    "city": "Ovalle",
    "comuna": "Ovalle",
    "address": "Ovalle, Norte y Centro de Chile",
    "latitude": -30.601733,
    "longitude": -71.198353
  },
  {
    "id": "cinepolis-calama-norte-y-centro-de-chile",
    "vistaId": "720",
    "name": "Cinépolis Calama",
    "slug": "cinepolis-calama-norte-y-centro-de-chile",
    "city": "Calama",
    "comuna": "Calama",
    "address": "Calama, Norte y Centro de Chile",
    "latitude": -22.448879,
    "longitude": -68.921158
  },
  {
    "id": "cinepolis-espacio-urbano-antofagasta-norte-y-centro-de-chile",
    "vistaId": "721",
    "name": "Cinépolis Espacio Urbano Antofagasta",
    "slug": "cinepolis-espacio-urbano-antofagasta-norte-y-centro-de-chile",
    "city": "Espacio Urbano Antofagasta",
    "comuna": "Espacio Urbano Antofagasta",
    "address": "Espacio Urbano Antofagasta, Norte y Centro de Chile",
    "latitude": -23.636613,
    "longitude": -70.396236
  },
  {
    "id": "cinepolis-vivo-coquimbo-norte-y-centro-de-chile",
    "vistaId": "917",
    "name": "Cinépolis Vivo Coquimbo",
    "slug": "cinepolis-vivo-coquimbo-norte-y-centro-de-chile",
    "city": "Vivo Coquimbo",
    "comuna": "Vivo Coquimbo",
    "address": "Vivo Coquimbo, Norte y Centro de Chile",
    "latitude": -29.958557,
    "longitude": -71.337524
  },
  {
    "id": "cinepolis-estacion-central-santiago-centro",
    "vistaId": "712",
    "name": "Cinépolis Estación Central",
    "slug": "cinepolis-estacion-central-santiago-centro",
    "city": "Santiago",
    "comuna": "Estación Central",
    "address": "Estación Central, Santiago Centro",
    "latitude": -33.452351,
    "longitude": -70.67821
  },
  {
    "id": "cinepolis-vivo-imperio-santiago-centro",
    "vistaId": "916",
    "name": "Cinépolis Vivo Imperio",
    "slug": "cinepolis-vivo-imperio-santiago-centro",
    "city": "Santiago",
    "comuna": "Vivo Imperio",
    "address": "Vivo Imperio, Santiago Centro",
    "latitude": -33.439513,
    "longitude": -70.648629
  },
  {
    "id": "cinepolis-la-reina-santiago-oriente",
    "vistaId": "707",
    "name": "Cinépolis La Reina",
    "slug": "cinepolis-la-reina-santiago-oriente",
    "city": "Santiago",
    "comuna": "La Reina",
    "address": "La Reina, Santiago Oriente",
    "latitude": -33.447406,
    "longitude": -70.570929
  },
  {
    "id": "cinepolis-mall-plaza-los-dominicos-santiago-oriente",
    "vistaId": "918",
    "name": "Cinépolis Mall Plaza Los Dominicos",
    "slug": "cinepolis-mall-plaza-los-dominicos-santiago-oriente",
    "city": "Santiago",
    "comuna": "Mall Plaza Los Dominicos",
    "address": "Mall Plaza Los Dominicos, Santiago Oriente",
    "latitude": -33.415198,
    "longitude": -70.541175
  },
  {
    "id": "cinepolis-paseo-los-trapenses-santiago-oriente",
    "vistaId": "726",
    "name": "Cinépolis Paseo Los Trapenses",
    "slug": "cinepolis-paseo-los-trapenses-santiago-oriente",
    "city": "Santiago",
    "comuna": "Paseo Los Trapenses",
    "address": "Paseo Los Trapenses, Santiago Oriente",
    "latitude": -33.34558,
    "longitude": -70.544837
  },
  {
    "id": "cinepolis-plaza-egana-santiago-oriente",
    "vistaId": "729",
    "name": "Cinépolis Plaza Egaña",
    "slug": "cinepolis-plaza-egana-santiago-oriente",
    "city": "Santiago",
    "comuna": "Plaza Egaña",
    "address": "Plaza Egaña, Santiago Oriente",
    "latitude": -33.452339,
    "longitude": -70.56947
  },
  {
    "id": "cinepolis-los-dominicos-santiago-oriente",
    "vistaId": "722",
    "name": "Cinépolis Paseo Los Dominicos (San Carlos)",
    "slug": "cinepolis-los-dominicos-santiago-oriente",
    "city": "Santiago",
    "comuna": "Paseo Los Dominicos (San Carlos)",
    "address": "Paseo Los Dominicos (San Carlos), Santiago Oriente",
    "latitude": -33.40182,
    "longitude": -70.514691
  },
  {
    "id": "cinepolis-mall-plaza-los-dominicos-premium-santiago-oriente",
    "vistaId": "919",
    "name": "Cinépolis Mall Plaza Los Dominicos Premium",
    "slug": "cinepolis-mall-plaza-los-dominicos-premium-santiago-oriente",
    "city": "Santiago",
    "comuna": "Mall Plaza Los Dominicos Premium",
    "address": "Mall Plaza Los Dominicos Premium, Santiago Oriente",
    "latitude": -33.415198,
    "longitude": -70.541175
  },
  {
    "id": "cinepolis-plaza-egana-premium-santiago-oriente",
    "vistaId": "760",
    "name": "Cinépolis Plaza Egaña Premium",
    "slug": "cinepolis-plaza-egana-premium-santiago-oriente",
    "city": "Santiago",
    "comuna": "Plaza Egaña Premium",
    "address": "Plaza Egaña Premium, Santiago Oriente",
    "latitude": -33.452339,
    "longitude": -70.56947
  },
  {
    "id": "cinepolis-parque-arauco-santiago-oriente",
    "vistaId": "708",
    "name": "Cinépolis Parque Arauco",
    "slug": "cinepolis-parque-arauco-santiago-oriente",
    "city": "Santiago",
    "comuna": "Parque Arauco",
    "address": "Parque Arauco, Santiago Oriente",
    "latitude": -33.401922,
    "longitude": -70.578358
  },
  {
    "id": "cinepolis-parque-arauco-premium-santiago-oriente",
    "vistaId": "709",
    "name": "Cinépolis Parque Arauco Premium",
    "slug": "cinepolis-parque-arauco-premium-santiago-oriente",
    "city": "Santiago",
    "comuna": "Parque Arauco Premium",
    "address": "Parque Arauco Premium, Santiago Oriente",
    "latitude": -33.401922,
    "longitude": -70.578358
  },
  {
    "id": "cinepolis-casa-costanera-santiago-oriente",
    "vistaId": "824",
    "name": "Cinépolis Casa Costanera",
    "slug": "cinepolis-casa-costanera-santiago-oriente",
    "city": "Santiago",
    "comuna": "Casa Costanera",
    "address": "Casa Costanera, Santiago Oriente",
    "latitude": -33.398433,
    "longitude": -70.598449
  },
  {
    "id": "boulevard-terrazas-maipu-santiago-poniente-y-norte",
    "vistaId": "981",
    "name": "Cinépolis Boulevard Terrazas Maipú",
    "slug": "boulevard-terrazas-maipu-santiago-poniente-y-norte",
    "city": "Santiago",
    "comuna": "Boulevard Terrazas Maipú",
    "address": "Boulevard Terrazas Maipú, Santiago Poniente y Norte",
    "latitude": -33.5007538,
    "longitude": -70.7614415
  },
  {
    "id": "cinepolis-patio-outlet-maipu-santiago-poniente-y-norte",
    "vistaId": "1091",
    "name": "Cinépolis Patio Outlet Maipú",
    "slug": "cinepolis-patio-outlet-maipu-santiago-poniente-y-norte",
    "city": "Santiago",
    "comuna": "Patio Outlet Maipú",
    "address": "Patio Outlet Maipú, Santiago Poniente y Norte",
    "latitude": -33.522358,
    "longitude": -70.732371
  },
  {
    "id": "cinepolis-santa-maria-melipilla-santiago-poniente-y-norte",
    "vistaId": "1349",
    "name": "Cinépolis Santa Maria Melipilla",
    "slug": "cinepolis-santa-maria-melipilla-santiago-poniente-y-norte",
    "city": "Santiago",
    "comuna": "Santa Maria Melipilla",
    "address": "Santa Maria Melipilla, Santiago Poniente y Norte",
    "latitude": -33.6803037,
    "longitude": -71.1880754
  },
  {
    "id": "cinepolis-arauco-maipu-santiago-poniente-y-norte",
    "vistaId": "710",
    "name": "Cinépolis Arauco Maipu",
    "slug": "cinepolis-arauco-maipu-santiago-poniente-y-norte",
    "city": "Santiago",
    "comuna": "Arauco Maipu",
    "address": "Arauco Maipu, Santiago Poniente y Norte",
    "latitude": -33.48236,
    "longitude": -70.751996
  },
  {
    "id": "cinepolis-arauco-quilicura-santiago-poniente-y-norte",
    "vistaId": "724",
    "name": "Cinépolis Arauco Quilicura",
    "slug": "cinepolis-arauco-quilicura-santiago-poniente-y-norte",
    "city": "Santiago",
    "comuna": "Arauco Quilicura",
    "address": "Arauco Quilicura, Santiago Poniente y Norte",
    "latitude": -33.368553,
    "longitude": -70.730045
  },
  {
    "id": "cinepolis-espacio-urbano-melipilla-santiago-poniente-y-norte",
    "vistaId": "727",
    "name": "Cinépolis Espacio Urbano Melipilla",
    "slug": "cinepolis-espacio-urbano-melipilla-santiago-poniente-y-norte",
    "city": "Santiago",
    "comuna": "Espacio Urbano Melipilla",
    "address": "Espacio Urbano Melipilla, Santiago Poniente y Norte",
    "latitude": -33.684889,
    "longitude": -71.213661
  },
  {
    "id": "cinepolis-patio-outlet-la-florida-santiago-sur",
    "vistaId": "1089",
    "name": "Cinépolis Patio Outlet La Florida",
    "slug": "cinepolis-patio-outlet-la-florida-santiago-sur",
    "city": "Santiago",
    "comuna": "Patio Outlet La Florida",
    "address": "Patio Outlet La Florida, Santiago Sur",
    "latitude": -33.535254,
    "longitude": -70.570968
  },
  {
    "id": "cinepolis-espacio-urbano-puente-alto-santiago-sur",
    "vistaId": "1259",
    "name": "Cinépolis Espacio Urbano Puente Alto",
    "slug": "cinepolis-espacio-urbano-puente-alto-santiago-sur",
    "city": "Santiago",
    "comuna": "Espacio Urbano Puente Alto",
    "address": "Espacio Urbano Puente Alto, Santiago Sur",
    "latitude": -33.599791,
    "longitude": -70.574873
  },
  {
    "id": "cinepolis-plazuela-independencia-puente-alto-santiago-sur",
    "vistaId": "713",
    "name": "Cinépolis Plazuela Independencia Puente Alto",
    "slug": "cinepolis-plazuela-independencia-puente-alto-santiago-sur",
    "city": "Santiago",
    "comuna": "Plazuela Independencia Puente Alto",
    "address": "Plazuela Independencia Puente Alto, Santiago Sur",
    "latitude": -33.600932,
    "longitude": -70.579246
  },
  {
    "id": "cinepolis-mall-plaza-sur-santiago-sur",
    "vistaId": "718",
    "name": "Cinépolis Mall Plaza Sur",
    "slug": "cinepolis-mall-plaza-sur-santiago-sur",
    "city": "Santiago",
    "comuna": "Mall Plaza Sur",
    "address": "Mall Plaza Sur, Santiago Sur",
    "latitude": -33.631156,
    "longitude": -70.710775
  },
  {
    "id": "cinepolis-san-bernardo-santiago-sur",
    "vistaId": "725",
    "name": "Cinépolis San Bernardo",
    "slug": "cinepolis-san-bernardo-santiago-sur",
    "city": "Santiago",
    "comuna": "San Bernardo",
    "address": "San Bernardo, Santiago Sur",
    "latitude": -33.595115,
    "longitude": -70.706689
  },
  {
    "id": "cinepolis-vivo-san-fernando-sur-de-chile",
    "vistaId": "843",
    "name": "Cinépolis Vivo San Fernando",
    "slug": "cinepolis-vivo-san-fernando-sur-de-chile",
    "city": "Vivo San Fernando",
    "comuna": "Vivo San Fernando",
    "address": "Vivo San Fernando, Sur de Chile",
    "latitude": -34.585887,
    "longitude": -70.985476
  },
  {
    "id": "cinepolis-plaza-maule-talca-sur-de-chile",
    "vistaId": "716",
    "name": "Cinépolis Plaza Maule Talca",
    "slug": "cinepolis-plaza-maule-talca-sur-de-chile",
    "city": "Plaza Maule Talca",
    "comuna": "Plaza Maule Talca",
    "address": "Plaza Maule Talca, Sur de Chile",
    "latitude": -35.432158,
    "longitude": -71.629963
  },
  {
    "id": "cinepolis-mallplaza-los-angeles-sur-de-chile",
    "vistaId": "719",
    "name": "Cinépolis Mallplaza Los Ángeles",
    "slug": "cinepolis-mallplaza-los-angeles-sur-de-chile",
    "city": "Mallplaza Los Ángeles",
    "comuna": "Mallplaza Los Ángeles",
    "address": "Mallplaza Los Ángeles, Sur de Chile",
    "latitude": -37.468321,
    "longitude": -72.5281
  },
  {
    "id": "cinepolis-temuco-edificio-paris-sur-de-chile",
    "vistaId": "723",
    "name": "Cinépolis Temuco (Edificio Paris)",
    "slug": "cinepolis-temuco-edificio-paris-sur-de-chile",
    "city": "Temuco (Edificio Paris)",
    "comuna": "Temuco (Edificio Paris)",
    "address": "Temuco (Edificio Paris), Sur de Chile",
    "latitude": -38.738167,
    "longitude": -72.591056
  },
  {
    "id": "cinepolis-arauco-chillan-sur-de-chile",
    "vistaId": "730",
    "name": "Cinépolis Arauco Chillan",
    "slug": "cinepolis-arauco-chillan-sur-de-chile",
    "city": "Arauco Chillan",
    "comuna": "Arauco Chillan",
    "address": "Arauco Chillan, Sur de Chile",
    "latitude": -36.609865,
    "longitude": -72.099938
  },
  {
    "id": "cinepolis-paseo-chiloe-sur-de-chile",
    "vistaId": "1007",
    "name": "Cinépolis Paseo Chiloe",
    "slug": "cinepolis-paseo-chiloe-sur-de-chile",
    "city": "Paseo Chiloe",
    "comuna": "Paseo Chiloe",
    "address": "Paseo Chiloe, Sur de Chile",
    "latitude": -42.479699,
    "longitude": -73.762209
  },
  {
    "id": "cinepolis-patio-outlet-temuco-sur-de-chile",
    "vistaId": "1197",
    "name": "Cinépolis Patio outlet Temuco",
    "slug": "cinepolis-patio-outlet-temuco-sur-de-chile",
    "city": "Patio outlet Temuco",
    "comuna": "Patio outlet Temuco",
    "address": "Patio outlet Temuco, Sur de Chile",
    "latitude": -38.75079,
    "longitude": -72.604439
  },
  {
    "id": "cinepolis-paseo-costanera-puerto-montt-sur-de-chile",
    "vistaId": "1006",
    "name": "Cinépolis Paseo Costanera Puerto Montt",
    "slug": "cinepolis-paseo-costanera-puerto-montt-sur-de-chile",
    "city": "Paseo Costanera Puerto Montt",
    "comuna": "Paseo Costanera Puerto Montt",
    "address": "Paseo Costanera Puerto Montt, Sur de Chile",
    "latitude": -41.472611,
    "longitude": -72.936508
  },
  {
    "id": "cinepolis-outlet-paseo-alerce-sur-de-chile",
    "vistaId": "1358",
    "name": "Cinépolis Outlet Paseo Alerce",
    "slug": "cinepolis-outlet-paseo-alerce-sur-de-chile",
    "city": "Outlet Paseo Alerce",
    "comuna": "Outlet Paseo Alerce",
    "address": "Outlet Paseo Alerce, Sur de Chile",
    "latitude": -41.440971,
    "longitude": -72.9163514
  }
];

export async function initializeCinepolis(delayMs = 500): Promise<void> {
  configureRequests(delayMs);
}

export function listCinemasSync(): CinepolisCinema[] {
  return CINES_CINEPOLIS;
}

import { PATRON_FUNCION_SECRETA } from "../../utils/funcionesSecretas.ts";

// Filtro para consultas públicas que usan el alias p para la película.
export const PELICULA_VISIBLE_SQL = `p.titulo !~* $funcion_secreta$${PATRON_FUNCION_SECRETA}$funcion_secreta$`;

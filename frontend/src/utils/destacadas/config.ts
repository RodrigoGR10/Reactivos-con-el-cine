import type { CategoriaDestacada, ReglaCupoCategoria } from "./types";

export const CONFIG_CUPOS_DESTACADAS: readonly ReglaCupoCategoria[] = [
  {
    categoria: "favoritas",
    min: 0,
    max: 2,
    pesoVariable: 1.6,
    estrategia: "top",
  },
  {
    categoria: "estrenos_recientes",
    min: 1,
    max: 1,
    pesoVariable: 0,
    estrategia: "aleatoria",
    topAleatorio: 6,
  },
  {
    categoria: "preventas_esperadas",
    min: 1,
    max: 2,
    pesoVariable: 1.2,
    estrategia: "aleatoria",
    topAleatorio: 2,
  },
  {
    categoria: "mejor_valoradas",
    min: 0,
    max: 2,
    pesoVariable: 2.0,
    estrategia: "aleatoria",
    topAleatorio: 5,
  },
  {
    categoria: "en_mas_salas",
    min: 0,
    max: 1,
    pesoVariable: 1.7,
    estrategia: "aleatoria",
    topAleatorio: 5,
  },
  {
    categoria: "reestrenos",
    min: 0,
    max: 1,
    pesoVariable: 1.6,
    estrategia: "aleatoria",
    topAleatorio: 6,
  },
];

export const MS_POR_DIA = 86_400_000;
export const DIAS_ESTRENO_RECIENTE = 14;
export const DIAS_MAX_ESTRENO_ORIGINAL_PARA_NOVEDAD = 540;
export const DIAS_MIN_REESTRENO = 730;
export const MIN_FAVORITOS_PARA_DESTACAR = 1;
export const CINES_MIN_EN_MAS_SALAS = 5;
export const VOTOS_MIN_MEJOR_VALORADA = 100;
export const RATING_MIN_MEJOR_VALORADA = 7.2;
export const PRIOR_VOTOS_BAYESIANO = 200;
export const PRIOR_RATING_BAYESIANO = 7.2;
export const PESO_FAVORITOS_PREVENTA = 0.4;
export const PESO_CINES_PREVENTA = 0.4;
export const PESO_POPULARIDAD_PREVENTA = 0.2;
export const PUNTAJE_MIN_PREVENTA_ESPERADA = 400;
export const CATEGORIAS_PRIMER_SLIDE = new Set<CategoriaDestacada>([
  "favoritas",
  "preventas_esperadas",
  "mejor_valoradas",
  "estrenos_recientes",
  "en_mas_salas",
]);

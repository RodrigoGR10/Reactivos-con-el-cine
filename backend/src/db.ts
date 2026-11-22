//Este modulo inicaliza el pool de conexiones pg

// pg es una libreria que permite actuar como puente para comunicar
// las ordenes del cliente (las consultas de aqui) con el servidor (la BDD)

//Por otro lado, el pool gestiona un cjto de conexiones
//activas hacia la base de datos y tiene la ventaja de que reutiliza esas conexiones
// una vez inicializadas

//Es importante reutilizarlas porque establecer una conexion nueva por cada
//consulta hacia la BDD implica costos de autenticacion, negociacion de sockets y
//carga de config de sesion

import { Pool } from "pg";
import type { QueryResult, QueryResultRow } from "pg";
import config from "./utils/config.ts";
import logger from "./utils/logger.ts";

const schema = config.DATABASE_SCHEMA || "public";

export const pool = new Pool({
    connectionString: config.DATABASE_URL,
    options: `-c search_path=${schema},public`,
    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on("error", (err: Error) => {
    logger.error("Error inesperado en cliente inactivo de Postgre:", err);
});

/**
 * Ejecuta una consulta parametrizada en PostgreSQL y devuelve sus filas.
 * @param text Texto que se analiza o transforma.
 * @param params Valores para los parámetros posicionales de la consulta SQL.
 * @returns Filas y metadatos devueltos por PostgreSQL.
 */
export const query = async <T extends QueryResultRow = Record<string, unknown>>(
    text: string,
    params?: unknown[],
): Promise<QueryResult<T>> => {
    return pool.query<T, unknown[]>(text, params);
};

//Ahora validamos el formato estandar de expresiones regulares para querys
// Esto es netamente tecnico, el formato estandar es:
// 8 digitos hexadecimales - 3 bloques consecutivos de 4 digitos hexadecimales
// un bloque de 12 digitos hexadecimales

//Cada digito hexadecimal es representado por [0-9a-f]
// Si quieres un bloque de digitos, colocas {numero} despues de el digito con corchetes []

//Ademas, cada digito debe ir separado por un -
//^ marca inicio de texto
//$ marca fin de texto

const UUID_REGEX = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/**
 * Comprueba si una cadena tiene el formato de un UUID.
 * @param val Texto que se valida como identificador.
 * @returns Resultado que indica si se cumple la condición evaluada.
 */
export const isUuid = (val: string): boolean => UUID_REGEX.test(val);

//Validacion exclusiva para cines.id ("cadena:idOrigen")
/**
 * Valida un identificador de cine y limita su longitud.
 * @param val Texto que se valida como identificador.
 * @param maxLength Longitud máxima permitida para el identificador.
 * @returns Valor booleano que indica si se cumple la condición.
 */
export const isCineId = (val: unknown, maxLength = 100): val is string =>
    typeof val === "string" && val.length > 0 && val.length <= maxLength;

//Validación para peliculas.id, horarios.id y tarifas.id (SERIAL)
/**
 * Comprueba si el identificador contiene un número válido.
 * @param val Texto que se valida como identificador.
 * @returns Resultado que indica si se cumple la condición evaluada.
 */
export const isNumericId = (val: string | number): boolean => {
    if (typeof val === "string" && !/^\d+$/.test(val)) return false;

    const num = Number(val);
    return Number.isInteger(num) && num > 0 && num <= 2_147_483_647;
};

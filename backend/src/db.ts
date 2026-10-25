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
    idelTimeoutMillis: 30000,
});

pool.on("error", (err: Error) => {
    logger.error("Error inesperado en cliente inactivo de Postgre:", err);
});

export const query = async <T extends QueryResultRow = any>(
    text: string,
    params?: any[],
): Promise<QueryResult<T>> => {
    return pool.query<T>(text, params);
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

export const isUuid = (val: string): boolean => UUID_REGEX.test(val);

// Los IDs de cines, peliculas y funciones vienen del scraper con formato
// "cadena:idOrigen" (ej. "cinemark:123"), no son UUID. Solo users.id es UUID.
// El limite de largo evita pasar basura a la BDD (las columnas son VARCHAR(100)
// en cines/peliculas y VARCHAR(150) en funciones).
export const isSourceId = (val: unknown, maxLength = 100): val is string =>
    typeof val === "string" && val.length > 0 && val.length <= maxLength;

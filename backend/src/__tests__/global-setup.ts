import { readFile } from "node:fs/promises";
import { Client } from "pg";

const DATABASE_URL =
    process.env.DATABASE_URL ??
    "postgresql://postgres@localhost:5433/cine_test";

/**
 * Deja la base de tests con el esquema actualizado antes de ejecutar
 * cualquier archivo. schema.sql es idempotente sobre una base existente.
 */
export default async function setup() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
    } catch (error) {
        throw new Error(
            `No se pudo conectar a PostgreSQL en ${DATABASE_URL}. ` +
                "Levanta el entorno del proyecto (direnv allow) antes de correr los tests.\n" +
                (error instanceof Error ? error.message : String(error)),
        );
    }

    try {
        const schema = await readFile(
            new URL("../../schema.sql", import.meta.url),
            "utf8",
        );
        await client.query(schema);
    } finally {
        await client.end();
    }
}

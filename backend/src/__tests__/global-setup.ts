import { readFile } from "node:fs/promises";
import { Client } from "pg";

// globalSetup corre antes de que Vitest inyecte test.env, por eso se lee
// TEST_DATABASE_URL (la misma variable que usa vitest.config.ts) primero.
const DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://postgres@localhost:5433/cine_test";

/** Extrae solo el nombre de la base, sin credenciales ni parametros. */
function nombreBaseDeDatos(url: string): string {
    try {
        return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
    } catch {
        return "";
    }
}

/**
 * Deja la base de tests con el esquema actualizado antes de ejecutar
 * cualquier archivo. schema.sql es idempotente sobre una base existente.
 */
export default async function setup() {
    const base = nombreBaseDeDatos(DATABASE_URL);

    // El setup aplica schema.sql: nunca debe apuntar a la base de desarrollo.
    if (!base.endsWith("_test")) {
        throw new Error(
            `Por seguridad, los tests solo se ejecutan sobre una base cuyo nombre termine en "_test". ` +
                `La base configurada es "${base || "(sin nombre)"}". ` +
                "Define TEST_DATABASE_URL con una base de pruebas, por ejemplo " +
                "postgresql://postgres@localhost:5433/cine_test.",
        );
    }

    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
    } catch (error) {
        throw new Error(
            `No se pudo conectar a PostgreSQL en la base "${base}". ` +
                "Levanta el entorno del proyecto (direnv allow) y crea la base con " +
                "createdb -h localhost -p 5433 -U postgres cine_test.\n" +
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

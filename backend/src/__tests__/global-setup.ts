import { readFile } from "node:fs/promises";
import { Client } from "pg";
import type { TestProject } from "vitest/node";

/**
 * Deja la base de tests con el esquema actualizado antes de ejecutar
 * cualquier archivo. schema.sql es idempotente sobre una base existente.
 */
export default async function setup(project: TestProject) {
    const connectionString = project.config.env?.DATABASE_URL;
    if (!connectionString) {
        throw new Error(
            "La configuración de Vitest requiere una URL de PostgreSQL para las pruebas.",
        );
    }

    const client = new Client({ connectionString });
    const base = client.database;

    // El setup aplica schema.sql: nunca debe apuntar a la base de desarrollo.
    if (!base?.endsWith("_test")) {
        throw new Error(
            `Por seguridad, los tests solo se ejecutan sobre una base cuyo nombre termine en "_test". ` +
                `La base configurada es "${base || "(sin nombre)"}". ` +
                "Define TEST_DATABASE_URL con una base de pruebas, por ejemplo " +
                "postgresql://postgres@localhost:5433/cine_test.",
        );
    }

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

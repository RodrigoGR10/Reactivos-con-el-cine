import { readFile } from "node:fs/promises";

const databaseUrl =
    process.env.E2E_DATABASE_URL ??
    "postgresql://postgres@localhost:5433/cine_e2e_test";

const database = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
if (!database.endsWith("_e2e_test")) {
    throw new Error(
        "E2E_DATABASE_URL debe apuntar a una base terminada en _e2e_test.",
    );
}

process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_SCHEMA = "public";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "secreto-local-exclusivo-de-playwright";

const { pool } = await import("../src/db.ts");
const lock = await pool.connect();
try {
    const { rows } = await lock.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock(45173, 4301) AS acquired",
    );
    if (!rows[0]?.acquired) {
        throw new Error("Ya hay otra ejecución e2e usando esta base de datos.");
    }

    const { sembrarCartelera } = await import("./cartelera.ts");
    await lock.query(
        await readFile(new URL("../schema.sql", import.meta.url), "utf8"),
    );
    await sembrarCartelera();

    // La conexión permanece abierta mientras se sirve la API y libera el candado al salir.
    await import("../src/index.ts");
} catch (error) {
    lock.release(true);
    await pool.end();
    throw error;
}

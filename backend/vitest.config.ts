import { defineConfig } from "vitest/config";

// El flake de Nix fija PostgreSQL en el puerto 5433. TEST_DATABASE_URL permite
// apuntar a otra instancia (CI, contenedor) sin editar este archivo.
const TEST_DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres@localhost:5433/cine_test";

export default defineConfig({
    test: {
        environment: "node",
        env: {
            NODE_ENV: "test",
            DATABASE_URL: TEST_DATABASE_URL,
            JWT_SECRET: "secreto-exclusivo-para-tests-de-integracion",
        },
        globalSetup: ["./src/__tests__/global-setup.ts"],
        // Los tests de integracion comparten la base cine_test: se ejecutan
        // de a un archivo para que la limpieza de uno no afecte a otro.
        fileParallelism: false,
        include: ["src/**/__tests__/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            include: ["src/**/*.ts"],
            exclude: [
                "src/index.ts",
                "src/scraper/cli.ts",
                "src/scraper/import-cli.ts",
            ],
        },
    },
});

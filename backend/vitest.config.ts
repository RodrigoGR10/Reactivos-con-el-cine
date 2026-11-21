import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        env: {
            NODE_ENV: "test",
            DATABASE_URL: "postgresql://postgres@localhost:5433/cine_test",
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

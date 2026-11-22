import { defineConfig } from "@playwright/test";

const frontendUrl = "http://127.0.0.1:4173";
const backendUrl = "http://127.0.0.1:4301";

export default defineConfig({
    testDir: "./e2etests",
    testMatch: "**/*.spec.ts",
    workers: 1,
    reporter: "list",
    use: {
        baseURL: frontendUrl,
        headless: true,
        locale: "es-CL",
        timezoneId: "America/Santiago",
    },
    projects: [
        { name: "chromium", use: { browserName: "chromium" } },
        { name: "firefox", use: { browserName: "firefox" } },
        { name: "webkit", use: { browserName: "webkit" } },
    ],
    webServer: [
        {
            command: "node e2e/server.ts",
            cwd: "../backend",
            env: {
                HOST: "127.0.0.1",
                PORT: "4301",
                FRONTEND_URL: frontendUrl,
            },
            url: `${backendUrl}/api/cines`,
            reuseExistingServer: false,
        },
        {
            command:
                "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort",
            env: {
                VITE_API_URL: "/api",
                API_PROXY_TARGET: backendUrl,
            },
            url: frontendUrl,
            reuseExistingServer: false,
        },
    ],
});

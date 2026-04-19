import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        pool: "forks",
        environment: "node",
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
        },
        clearMocks: true,
    },
});

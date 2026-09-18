import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/content/**/*.test.ts",
      "tests/sandbox/**/*.test.ts",
    ],
    exclude: ["tests/e2e/**", "node_modules/**"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      thresholds: { lines: 85 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    globalSetup: "./src/__tests__/globalSetup.ts",
    setupFiles: ["./src/__tests__/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: true,
    pool: "forks",
    maxWorkers: 4,
    reporters: ["tree"],
  },
})

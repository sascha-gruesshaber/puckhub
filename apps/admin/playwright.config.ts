import { defineConfig } from "@playwright/test"

const ADMIN_PORT = 4000
const API_PORT = 4001

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${ADMIN_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${ADMIN_PORT}`,
    port: ADMIN_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      VITE_API_URL: `http://localhost:${API_PORT}`,
      VITE_LOCALE: "raw",
    },
  },
})

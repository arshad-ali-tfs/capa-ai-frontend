import { defineConfig } from "@playwright/test"
const baseURL = process.env.CAPA_TEST_BASE_URL || "http://127.0.0.1:8100"
const productionServer = process.env.CAPA_TEST_SERVER === "production" || !process.env.CAPA_TEST_BASE_URL
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: [["list"], ["json", { outputFile: ".local/browser-tests.json" }]],
  outputDir: ".local/browser-artifacts",
  use: {
    baseURL,
    channel: process.env.CAPA_TEST_BROWSER_CHANNEL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: productionServer ? "npm run start" : `npm run dev -- --port ${new URL(baseURL).port} --strictPort`,
    env: productionServer ? { PORT: new URL(baseURL).port, DATABRICKS_APP_PORT: "", FRONTEND_HOST: "127.0.0.1" } : {},
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    { name: "unit", testMatch: /[\\/]unit[\\/].*\.spec\.ts$/ },
    {
      name: "desktop",
      testIgnore: /[\\/]unit[\\/]/,
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "tablet",
      testIgnore: /[\\/]unit[\\/]/,
      use: { viewport: { width: 820, height: 1180 } },
    },
    {
      name: "phone",
      testIgnore: /[\\/]unit[\\/]/,
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})

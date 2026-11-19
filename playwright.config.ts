import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: [["list"], ["json", { outputFile: ".local/browser-tests.json" }]],
  outputDir: ".local/browser-artifacts",
  use: {
    baseURL: "http://127.0.0.1:8100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:8100",
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

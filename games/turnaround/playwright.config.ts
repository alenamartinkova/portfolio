import { defineConfig } from "@playwright/test";
import { browserDefaults } from "../../config/playwright.js";
export default defineConfig({
  ...browserDefaults,
  testMatch: "**/browser.spec.ts",
  projects: browserDefaults.projects!.filter((p) => p.name === "desktop"),
  use: { ...browserDefaults.use, baseURL: "http://127.0.0.1:4182/turnaround/" },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:4182/turnaround/",
    reuseExistingServer: !process.env.CI,
  },
});

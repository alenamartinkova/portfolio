import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
export default defineConfig({
  ...config,
  testMatch: "**/power.spec.ts",
  outputDir: "./test-results/power",
  timeout: 150_000,
});

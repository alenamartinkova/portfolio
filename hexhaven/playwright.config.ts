import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174/hexhaven/',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.CI || !existsSync(localChrome) ? {} : { channel: 'chrome' }),
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 } },
    {
      name: 'mobile',
      testIgnore: '**/perf.spec.ts',
      use: {
        viewport: { width: 380, height: 820 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev -- --strictPort',
      url: 'http://127.0.0.1:4174/hexhaven/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'pnpm exec vite preview --host 127.0.0.1 --port 4175 --strictPort',
      url: 'http://127.0.0.1:4175/hexhaven/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'pnpm --dir .. exec vite preview --host 127.0.0.1 --port 4176 --strictPort',
      url: 'http://127.0.0.1:4176/lego/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});

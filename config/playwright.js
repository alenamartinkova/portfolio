import { existsSync } from 'node:fs'

const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// Paths are resolved relative to each game's Playwright config.
/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const browserDefaults = {
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
      use: { viewport: { width: 380, height: 820 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
    },
  ],
}

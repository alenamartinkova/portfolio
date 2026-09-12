import { defineConfig } from '@playwright/test'
import { browserDefaults } from './config/playwright.js'

// Allow parallel worktrees to test without reusing an unrelated preview server.
const port = Number(process.env.PORTFOLIO_TEST_PORT || 4180)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  ...browserDefaults,
  testMatch: '**/responsive.spec.ts',
  use: { ...browserDefaults.use, baseURL, reducedMotion: 'reduce' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    ...[
      ['small-phone', 320, 568],
      ['phone', 390, 844],
      ['landscape', 844, 390],
      ['tablet', 768, 1024],
    ].map(([name, width, height]) => ({
      name,
      use: { viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    })),
  ],
  webServer: {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})

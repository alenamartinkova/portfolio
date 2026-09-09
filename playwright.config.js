import { defineConfig } from '@playwright/test'
import { browserDefaults } from './config/playwright.js'

export default defineConfig({
  ...browserDefaults,
  testMatch: '**/responsive.spec.ts',
  use: { ...browserDefaults.use, baseURL: 'http://127.0.0.1:4180', reducedMotion: 'reduce' },
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
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4180 --strictPort',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: !process.env.CI,
  },
})

import { defineConfig } from '@playwright/test'
import { browserDefaults } from './playwright.js'

export default defineConfig({
  ...browserDefaults,
  testDir: '../tests',
  testMatch: '**/games-performance.spec.ts',
  outputDir: '../test-results/games',
  use: { ...browserDefaults.use, baseURL: 'http://127.0.0.1:4288' },
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4288 --strictPort',
    cwd: new URL('../', import.meta.url).pathname,
    url: 'http://127.0.0.1:4288/games/',
    reuseExistingServer: !process.env.CI,
  },
})

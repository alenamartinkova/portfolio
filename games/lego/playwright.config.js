import { defineConfig } from '@playwright/test'
import { browserDefaults } from '../../config/playwright.js'

export default defineConfig({
  ...browserDefaults,
  use: { ...browserDefaults.use, baseURL: 'http://127.0.0.1:4176/lego/' },
  webServer: {
    command: 'pnpm --dir ../.. exec vite preview --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176/lego/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})

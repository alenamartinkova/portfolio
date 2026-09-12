import { defineConfig } from '@playwright/test';
import { browserDefaults } from '../../config/playwright.js';

export default defineConfig({
  ...browserDefaults,
  use: { ...browserDefaults.use, baseURL: 'http://127.0.0.1:4174/hexhaven/' },
  webServer: [
    {
      command: 'pnpm dev -- --strictPort',
      url: 'http://127.0.0.1:4174/hexhaven/',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'pnpm --dir ../.. exec vite preview --host 127.0.0.1 --port 4175 --strictPort',
      url: 'http://127.0.0.1:4175/hexhaven/',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});

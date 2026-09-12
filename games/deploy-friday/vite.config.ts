import { defineConfig } from 'vitest/config';
import { gameConfig } from '../../config/game.js';
export default defineConfig({
  ...gameConfig('deploy-friday'),
  test: { include: ['tests/**/*.test.ts'] },
});

import { defineConfig } from 'vitest/config';
import { gameConfig } from '../../config/game.js';

export default defineConfig({
  ...gameConfig('hexhaven'),
  test: { include: ['tests/**/*.test.ts'] },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/hexhaven/',
  build: { outDir: '../build/hexhaven', emptyOutDir: true, target: 'es2022' },
  test: { include: ['tests/**/*.test.ts'] },
});

import { defineConfig } from "vitest/config";
import { gameConfig } from "../../config/game.js";
export default defineConfig({
  ...gameConfig("forklift"),
  test: { include: ["tests/**/*.test.ts"] },
});

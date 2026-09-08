import { fileURLToPath } from 'node:url'
import { GAMES } from '../games/catalog.js'

/** Common routing and output layout for every standalone game workspace. */
export function gameConfig(id) {
  const game = GAMES.find(game => game.id === id)
  if (!game) throw new Error(`Game "${id}" is missing from games/catalog.js`)

  return {
    base: `/${id}/`,
    server: { port: game.port, strictPort: true },
    // Absolute paths also work when a config is loaded from the repository root.
    build: {
      outDir: fileURLToPath(new URL(`../build/${id}/`, import.meta.url)),
      emptyOutDir: true,
      target: 'es2022',
    },
  }
}

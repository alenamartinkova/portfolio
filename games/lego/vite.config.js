import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { gameConfig } from '../../config/game.js'

export default defineConfig({
  ...gameConfig('lego'),
  plugins: [react()],
})

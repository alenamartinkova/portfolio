import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GamesApp from './GamesApp'
import { initGlow } from '../glow'

initGlow()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GamesApp />
  </StrictMode>
)

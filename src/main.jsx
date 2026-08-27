import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initGlow } from './glow'

// Gates the scroll-reveal styles: if this module never runs, every .reveal
// block stays plainly visible instead of stuck at opacity 0.
document.documentElement.classList.add('js')

initGlow()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

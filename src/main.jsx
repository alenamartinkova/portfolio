import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Portfolio from './App'

// Vite falls back to index.html for unknown routes during local development.
// Production also marks the dedicated error document explicitly.
const portfolioPaths = new Set(['/', '/index.html', '/sk', '/sk/', '/sk/index.html', '/motion', '/motion/', '/motion/index.html'])
const isNotFound = document.documentElement.dataset.page === 'not-found' || !portfolioPaths.has(window.location.pathname)
const App = isNotFound ? (await import('./not-found/NotFound')).default : Portfolio

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

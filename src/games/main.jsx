import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import GamesApp from './GamesApp'
const root = document.getElementById('root')
if (root.hasChildNodes()) hydrateRoot(root, <StrictMode><GamesApp ssrLocale="en" /></StrictMode>)
else createRoot(root).render(<StrictMode><GamesApp /></StrictMode>)

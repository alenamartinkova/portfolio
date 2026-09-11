import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MotionPortfolio from './MotionPortfolio'

createRoot(document.getElementById('root')).render(
  <StrictMode><MotionPortfolio /></StrictMode>,
)

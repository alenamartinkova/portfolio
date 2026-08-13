import './ThemeToggle.css'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks'

export default function ThemeToggle() {
  const [theme, toggle] = useTheme()
  const isLight = theme === 'light'
  const label = `Switch to ${isLight ? 'dark' : 'light'} theme`

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle__icons" aria-hidden="true">
        <Sun className="theme-toggle__icon theme-toggle__icon--sun" />
        <Moon className="theme-toggle__icon theme-toggle__icon--moon" />
      </span>
    </button>
  )
}

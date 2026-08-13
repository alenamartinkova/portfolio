import './ThemeToggle.css'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks'
import { useT } from '../i18n'

export default function ThemeToggle() {
  const t = useT()
  const [theme, toggle] = useTheme()
  const isLight = theme === 'light'
  const label = t.appearance.theme(
    isLight ? t.appearance.themeDark : t.appearance.themeLight
  )

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

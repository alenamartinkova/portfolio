import { useEffect, useState } from 'react'

const THEME_KEY = 'theme'

/**
 * Dark is the default; only an explicit choice is stored. The initial value is
 * read from the attribute the inline script in index.html already applied, so
 * this hook never causes a flash.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined' &&
    document.documentElement.dataset.theme === 'light'
      ? 'light'
      : 'dark',
  )

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'light') root.dataset.theme = 'light'
    else delete root.dataset.theme

    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Private mode or blocked storage — the toggle still works per-session.
    }

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute(
        'content',
        getComputedStyle(root).getPropertyValue('--bg').trim(),
      )
    }
  }, [theme])

  const toggle = () =>
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  return [theme, toggle]
}

/** Copy text to the clipboard and flip a flag for ~2s so the UI can confirm. */
export function useCopy(text) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard blocked (insecure context, denied permission) — the mailto
      // link next to this button still works, so fail quietly.
    }
  }

  return [copied, copy]
}

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
      : 'dark'
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
        getComputedStyle(root).getPropertyValue('--bg').trim()
      )
    }
  }, [theme])

  const toggle = () => setTheme(current => (current === 'dark' ? 'light' : 'dark'))

  return [theme, toggle]
}

/** Fraction of the page scrolled, 0 → 1. Drives the nav progress rail. */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return progress
}

/** Id of the section currently closest to the top of the viewport. */
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    const elements = ids
      .map(id => document.getElementById(id))
      .filter(Boolean)

    if (!elements.length) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    )

    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [ids])

  return active
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

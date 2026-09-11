// Apply saved appearance before CSS paints, on both language URLs and Games.
try {
  const root = document.documentElement
  const light = localStorage.getItem('theme') === 'light'
  if (light) root.dataset.theme = 'light'
  const accent = localStorage.getItem('motion-accent') || localStorage.getItem('accent')
  if (['violet', 'cyan', 'lime', 'amber', 'rose', 'blue'].includes(accent)) root.dataset.accent = accent
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f2f2f7' : '#101018')
} catch { /* Default appearance also works when storage is blocked. */ }

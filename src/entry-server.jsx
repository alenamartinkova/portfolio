import { renderToString } from 'react-dom/server'
import App from './App'

/**
 * Used only by scripts/prerender.mjs at build time. The output is markup for
 * crawlers; the browser still boots the full app on top of it.
 */
export function render() {
  return renderToString(<App />)
}

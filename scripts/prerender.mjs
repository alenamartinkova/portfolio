/**
 * Injects statically rendered markup into build/index.html.
 *
 * Without this the deployed HTML ships an empty <div id="root">, so anything
 * that does not execute JavaScript — Seznam, social scrapers, and Google's
 * first crawl pass — sees the title and nothing else.
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const SSR_ENTRY = new URL('../build-ssr/entry-server.js', import.meta.url)
const HTML_PATH = new URL('../build/index.html', import.meta.url)
const PLACEHOLDER = '<div id="root"></div>'

const { render } = await import(pathToFileURL(SSR_ENTRY.pathname).href)
const markup = render()

const html = readFileSync(HTML_PATH, 'utf8')
if (!html.includes(PLACEHOLDER)) {
  throw new Error(`prerender: "${PLACEHOLDER}" not found in build/index.html`)
}

writeFileSync(
  HTML_PATH,
  html.replace(PLACEHOLDER, `<div id="root">${markup}</div>`)
)

rmSync(new URL('../build-ssr', import.meta.url), { recursive: true, force: true })

const words = markup.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
console.log(`prerender: ${words} crawlable words injected`)

/**
 * Injects statically rendered markup into build/index.html and derives a
 * second, fully Slovak page at build/sk/index.html from it.
 *
 * Without this the deployed HTML ships an empty <div id="root">, so anything
 * that does not execute JavaScript — Seznam, social scrapers, and Google's
 * first crawl pass — sees the title and nothing else. And without /sk/ the
 * Slovak version would be invisible to crawlers entirely: it only exists
 * behind a client-side toggle.
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const SSR_ENTRY = new URL('../build-ssr/entry-server.js', import.meta.url)
const HTML_PATH = new URL('../build/index.html', import.meta.url)
const SK_DIR = new URL('../build/sk/', import.meta.url)
const SK_HTML_PATH = new URL('../build/sk/index.html', import.meta.url)
const PLACEHOLDER = '<div id="root"></div>'
const ORIGIN = 'https://martinkova.dev'

const { render, metaFor } = await import(pathToFileURL(SSR_ENTRY.pathname).href)

const template = readFileSync(HTML_PATH, 'utf8')
if (!template.includes(PLACEHOLDER)) {
  throw new Error(`prerender: "${PLACEHOLDER}" not found in build/index.html`)
}

const inject = locale =>
  template.replace(PLACEHOLDER, `<div id="root">${render(locale)}</div>`)

/** Replace `value` everywhere it appears (title tag, og:, twitter:). */
function swap(html, from, to) {
  if (!html.includes(from)) {
    throw new Error(`prerender: expected to find "${from}" in the template`)
  }
  return html.replaceAll(from, to)
}

// --- English page — the template already carries the right metadata. -------
writeFileSync(HTML_PATH, inject('en'))

// --- Slovak page — same markup source, Slovak copy and locale metadata. ----
const en = metaFor('en')
const sk = metaFor('sk')

let skHtml = inject('sk')
skHtml = swap(skHtml, '<html lang="en">', '<html lang="sk">')
skHtml = swap(skHtml, en.title, sk.title)
skHtml = swap(skHtml, en.description, sk.description)
skHtml = swap(
  skHtml,
  `<link rel="canonical" href="${ORIGIN}/" />`,
  `<link rel="canonical" href="${ORIGIN}/sk/" />`
)
skHtml = swap(
  skHtml,
  `<meta property="og:url" content="${ORIGIN}/" />`,
  `<meta property="og:url" content="${ORIGIN}/sk/" />`
)
skHtml = swap(skHtml, 'content="en_US"', 'content="sk_SK"')
skHtml = swap(
  skHtml,
  '<meta property="og:locale:alternate" content="sk_SK" />',
  '<meta property="og:locale:alternate" content="en_US" />'
)
// Only the ProfilePage node is locale-specific; the WebSite node lists both.
skHtml = swap(skHtml, '"inLanguage": "en"', '"inLanguage": "sk"')
// Slovak needs the latin-ext faces for č/ď/ľ/š/ť/ž on first paint too.
skHtml = swap(
  skHtml,
  '<link\n      rel="preload"\n      href="/fonts/space-grotesk-latin.woff2"',
  '<link\n      rel="preload"\n      href="/fonts/space-grotesk-latin-ext.woff2"\n      as="font"\n      type="font/woff2"\n      crossorigin\n    />\n    <link\n      rel="preload"\n      href="/fonts/inter-latin-ext.woff2"\n      as="font"\n      type="font/woff2"\n      crossorigin\n    />\n    <link\n      rel="preload"\n      href="/fonts/jetbrains-mono-latin-ext.woff2"\n      as="font"\n      type="font/woff2"\n      crossorigin\n    />\n    <link\n      rel="preload"\n      href="/fonts/space-grotesk-latin.woff2"'
)

mkdirSync(SK_DIR, { recursive: true })
writeFileSync(SK_HTML_PATH, skHtml)

rmSync(new URL('../build-ssr', import.meta.url), { recursive: true, force: true })

for (const [label, path] of [['/', HTML_PATH], ['/sk/', SK_HTML_PATH]]) {
  const markup = readFileSync(path, 'utf8')
  const words = markup.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  console.log(`prerender: ${label} — ${words} crawlable words`)
}

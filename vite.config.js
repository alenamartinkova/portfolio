import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { GAMES } from './games/catalog.js'

const SITE_ORIGIN = 'https://martinkova.dev'

// Only canonical portfolio pages belong in the language cluster. Omit lastmod:
// the build date does not necessarily mean the page's content changed.
function sitemap(origin) {
  let isSsrBuild = false

  return {
    name: 'sitemap',
    apply: 'build',
    configResolved(config) {
      isSsrBuild = !!config.build.ssr
    },
    generateBundle() {
      if (isSsrBuild) return

      const alternates = `
    <xhtml:link rel="alternate" hreflang="en" href="${origin}/" />
    <xhtml:link rel="alternate" hreflang="sk" href="${origin}/sk/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}/" />`
      const url = loc => `  <url>
    <loc>${loc}</loc>
${alternates}
  </url>`

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${url(`${origin}/`)}
${url(`${origin}/sk/`)}
</urlset>
`,
      })
    },
  }
}

// Output stays in `build/` (not Vite's default `dist/`) so the Netlify
// publish directory keeps working.
export default defineConfig({
  plugins: [react(), sitemap(SITE_ORIGIN)],
  server: {
    port: 3000,
    open: true,
    proxy: Object.fromEntries(GAMES.map(({ id, port }) => [
      `/${id}/`,
      { target: `http://127.0.0.1:${port}`, ws: true },
    ])),
  },
  // Vite otherwise inherits server.proxy, but preview must serve build/ directly.
  preview: { proxy: {} },
  build: {
    outDir: 'build', emptyOutDir: true,
    rollupOptions: {
      input: { main: 'index.html', games: 'games/index.html', motion: 'motion/index.html' },
      output: {
        // Match the font preloads in both prerendered portfolio pages.
        assetFileNames: asset => asset.names.some(name => name.endsWith('.woff2'))
          ? 'fonts/[name][extname]'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
})

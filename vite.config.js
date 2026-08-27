import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SITE_ORIGIN = 'https://martinkova.dev'

// Emitted at build time so <lastmod> can never go stale in the repo.
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

      const lastmod = new Date().toISOString().slice(0, 10)
      const alternates = `
    <xhtml:link rel="alternate" hreflang="en" href="${origin}/" />
    <xhtml:link rel="alternate" hreflang="sk" href="${origin}/sk/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}/" />`
      const url = loc => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>${alternates}
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
  server: { port: 3000, open: true },
  build: { outDir: 'build', emptyOutDir: true },
})

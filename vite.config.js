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
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
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

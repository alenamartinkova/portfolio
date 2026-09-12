import { defineConfig } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { GAMES } from './games/catalog.js'

function gameBundleInventory() {
  let isSsrBuild = false
  return {
    name: 'game-bundle-inventory',
    apply: 'build',
    configResolved(config) { isSsrBuild = !!config.build.ssr },
    async writeBundle(options, bundle) {
      if (isSsrBuild) return
      const chunks = Object.fromEntries(Object.values(bundle).filter(file => file.type === 'chunk').map(file => [file.fileName, {
        imports: file.imports,
        dynamicImports: file.dynamicImports,
        modules: Object.keys(file.modules).map(id => id.replace(process.cwd() + '/', '')),
      }]))
      const directory = resolve(options.dir, '.vite')
      await mkdir(directory, { recursive: true })
      await writeFile(resolve(directory, 'game-bundles.json'), JSON.stringify(chunks, null, 2))
    },
  }
}

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
  // Modular Three entry lets the common graph share individual classes instead
  // of forcing every game to download the union of one monolithic module.
  resolve: { alias: [{ find: /^three$/, replacement: fileURLToPath(new URL('./games/hexhaven/node_modules/three/src/Three.js', import.meta.url)) }] },
  plugins: [react(), sitemap(SITE_ORIGIN), gameBundleInventory(), {
    name: 'game-route-output',
    apply: 'build',
    generateBundle: { order: 'post', handler(_options, bundle) {
      for (const { id } of GAMES) {
        const source = `games/${id}/index.html`
        if (!bundle[source]) continue
        const asset = bundle[source]
        delete bundle[source]
        this.emitFile({ type: 'asset', fileName: `${id}/index.html`, source: asset.source })
      }
    } },
  }],
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
      input: { main: 'index.html', games: 'games/index.html', motion: 'motion/index.html', ...Object.fromEntries(GAMES.map(({ id }) => [id, `games/${id}/index.html`])) },
      output: {
        codeSplitting: { groups: [
          // Never place the CJS/runtime bridge inside React: Babylon uses it too.
          { name: 'module-runtime', test: id => id.startsWith('\0rolldown/'), priority: 50 },
          { name: 'react', test: /node_modules\/.*\/(?:react|react-dom|scheduler)(?:\/|@)/, priority: 40 },
        ] },
        // Match the font preloads in both prerendered portfolio pages.
        assetFileNames: asset => asset.names.some(name => name.endsWith('.woff2'))
          ? 'fonts/[name][extname]'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
})

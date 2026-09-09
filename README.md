# Portfolio

Personal site — [martinkova.dev](https://martinkova.dev), built with React 19,
Vite and plain CSS. Games are independent pnpm workspaces.

## Development

Use Node 24 and pnpm 9.9.0.

```sh
pnpm install --frozen-lockfile
pnpm dev          # portfolio, game list and all games at http://localhost:3000
pnpm build        # prerender portfolio, then build all games into build/
pnpm preview      # serve the complete production output
pnpm lint         # JavaScript, JSX and TypeScript across the repository
pnpm typecheck    # games that provide a TypeScript check
pnpm test         # portfolio rendering and all game unit/component tests
pnpm e2e          # game browser suites sequentially; run pnpm build first
```

`pnpm start` aliases `pnpm dev`. For an individual game, use
`pnpm --filter <id> dev` (also available as `pnpm dev:lego` and
`pnpm dev:hexhaven`). The root development server proxies each game's URL to its
own Vite server. `dev:server` is the internal script used to start the workspaces
in parallel; the development ports come from `games/catalog.js`.

Browser suites run one game at a time so their WebGL renderers do not compete
for CPU on CI; each game also uses one Playwright worker. To reproduce software
rendering locally, install Chromium with `pnpm exec playwright install chromium`
and run `PLAYWRIGHT_SOFTWARE_GL=1 pnpm e2e`. This opts into SwiftShader using
Playwright's Chromium instead of local Chrome. Normal runs keep browser defaults.
CI uploads reports, screenshots and failure traces as `browser-verification`.
UI/state checks use reduced motion to avoid rendering the animated sea and
pulsing LEGO hints throughout DOM assertions. Hexhaven's separate 1440p
performance test keeps motion enabled and verifies that reduced-motion rendering
becomes idle after damping; LEGO's scene tests cover its animation lifecycle.

## Structure

```text
src/                       portfolio components, translations and entry points
  games/                   React page listing the games at /games/
  styles/base.css          portfolio reset and background
shared/styles/             fonts, colour tokens and shared navigation styles
public/                    site assets, fonts and derived photos
index.html                 portfolio document shell and SEO metadata
games/
  index.html               game list document shell
  catalog.js               game ids, titles, icons and development ports
  lego/                    LEGO source, HTML entry, tests and documentation
  hexhaven/                Hexhaven source, HTML entry, tests and documentation
  forklift/                Forklift Certified: Babylon.js + Havok warehouse game
config/
  game.js                  common game URLs, development ports and build output
  playwright.js            shared desktop/mobile browser test configuration
scripts/prerender.mjs       portfolio SSR markup and Slovak page generation
tests/                     portfolio and game list rendering tests
eslint.config.js           shared lint rules, including unused code checks
build/                     complete static site (generated, ignored by Git)
```

Each game owns its dependencies, source code, translations and tests. Games may
use `shared/` and `config/`, but do not import portfolio components or another
game's implementation. Three.js belongs to the game packages. The game list only
imports lightweight catalog metadata and icons.

## Adding a game

1. Create `games/<id>/` with `package.json`, `index.html`, `src/` and `tests/`.
   Set the package name to the game id and declare its own runtime dependencies.
2. Add its id, title, icon and a unique port to `games/catalog.js`. Map a new icon
   in `src/games/catalog.js` if needed, and add `games.<id>` copy to both
   `src/i18n/en.js` and `src/i18n/sk.js`.
3. Use the common Vite configuration, with any framework plugins the game needs:

   ```js
   import { defineConfig } from 'vite'
   import { gameConfig } from '../../config/game.js'

   export default defineConfig(gameConfig('<id>'))
   ```

4. Provide `dev`, `dev:server`, `build` and `test` scripts. Add `typecheck` or
   `e2e` when applicable; browser suites can reuse `config/playwright.js`.
5. Run `pnpm install` and the checks above. Workspace discovery, the root dev
   proxy and aggregate build/test commands already include `games/*`.

The game is served at `/<id>/` and builds into `build/<id>/`. Preserve `lang=en`
and `lang=sk` in links back to the game list and portfolio.

## Games

- [LEGO · Brick break](games/lego/README.md): twelve procedural models and free
  building at `/lego/`, with local saves, build sharing and optional sound.
- [Office Escape](games/office-escape/README.md): a third-person Babylon.js + Havok furniture escape at `/office-escape/`. Run `pnpm --filter office-escape dev`.
- [Hexhaven](games/hexhaven/README.md): procedural 3D trading and settlement at
  `/hexhaven/`, with local hotseat, bots, IndexedDB saves and deterministic replays.

```sh
pnpm sim --games=300 --seed=1     # Hexhaven headless tournament and invariants
pnpm exec playwright install chromium
```

## Portfolio rendering

The build prerenders `/` in English and `/sk/` in Slovak, with localized metadata
and hreflang links. `src/entry-server.jsx` supplies the markup to
`scripts/prerender.mjs`; language switching preserves the appropriate URL.
Portfolio translations live in `src/i18n/`; each game's translations stay in its
own source tree. The final static output remains `build/` for Netlify.

## Images

The full-resolution photo lives in `assets-src/` so it is **not** copied into
the build. `public/images/` holds only the derived files that ship:
`me-{340,430,680,860}.{jpg,webp}` for the About section and `og-image.jpg`
(1200×1200) for link previews.

To regenerate them after replacing `assets-src/me-original.jpg`:

```bash
for w in 340 430 680 860; do
  sips --resampleWidth $w -s format jpeg -s formatOptions 80 \
    --out public/images/me-$w.jpg assets-src/me-original.jpg
  cwebp -q 78 -resize $w 0 assets-src/me-original.jpg -o public/images/me-$w.webp
done
```

The OG image is a square crop offset from the top so the head is not clipped
(`sips -c 3840 3840 --cropOffset 96 0`), then resized to 1200×1200.

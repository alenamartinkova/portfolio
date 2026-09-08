# Portfolio

Personal site — [martinkova.dev](https://martinkova.dev)

Built with React 19 + Vite. No CSS framework, no UI kit: plain CSS with design
tokens in `src/styles/tokens.css`.

## Scripts

```bash
pnpm install     # install workspace dependencies
pnpm dev         # portfolio dev server on http://localhost:3000
pnpm build       # production portfolio and games into build/
pnpm preview     # serve the production build locally
```

`pnpm start` is kept as an alias for `pnpm dev`.

## Structure

```
index.html                 page shell, meta + OG + JSON-LD, font preloads
scripts/prerender.mjs      injects SSR markup and derives /sk/ at build time
src/main.jsx               entry point
src/entry-server.jsx       SSR entry used only by the prerender
src/App.jsx                page composition
src/App.css                layout + shared components (panels, chips, buttons)
src/styles/tokens.css      colors, radii, type scale, spacing
src/styles/base.css        reset, grid background, focus & scrollbar styles
src/styles/fonts.css       self-hosted variable fonts (files in public/fonts)
src/i18n/                  locale context + en/sk portfolio dictionaries
src/hooks.js               scroll progress, active section, copy-to-clipboard
src/glow.js                background bloom that trails the pointer
src/cursors.js             accent-coloured cursor bitmaps
src/components/            one .jsx + .css per section
public/                    static assets served from /
```

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

## Notes

- The build output goes to `build/` (not Vite's default `dist/`) so the existing
  deployment setup keeps working.
- The portfolio emits two pages: `/` (English) and `/sk/` (Slovak), each fully
  prerendered with its own metadata and cross-linked via hreflang. The language
  toggle syncs the URL with `history.replaceState`.
- All translatable copy lives in `src/i18n/en.js` and `src/i18n/sk.js`.
  Locale-invariant data stays in the components — project names, URLs and
  stacks in `References.jsx`, timeline tags in `Career.jsx`, panel file names
  in `Skills.jsx`, diagram geometry in `StackDiagram.jsx`.
- The architecture diagram in `StackDiagram.jsx` is hand-authored SVG; node
  positions are a simple coordinate grid at the top of the file.


## Games

A quiet **Games** link in the portfolio footer opens `/games/`. The standalone
page lists LEGO and Hexhaven and shares the portfolio's language and appearance
controls. `?lang=sk` / `?lang=en` preserve the language through the list and both games.

To add a game, add its entry in `src/games/catalog.js` and its copy under
`games.<id>` in both `src/i18n/en.js` and `src/i18n/sk.js`. The list lays out the
cards automatically. Give each game its own HTML entry or workspace build.

## Hexhaven

[Hexhaven — Traders of the Long Bay](hexhaven/README.md) is an original procedural
3D trading and settlement game at `/hexhaven/`. It supports local hotseat and
three bot difficulties, saves to IndexedDB, and exports deterministic replays.
Its strict TypeScript rules engine has no rendering or browser dependencies.

```sh
pnpm dev:hexhaven                 # http://127.0.0.1:4174/hexhaven/
pnpm typecheck && pnpm lint
pnpm test && pnpm build           # validates both games and the portfolio
pnpm sim --games=300 --seed=1      # headless tournament with invariants
pnpm e2e                         # requires build and Playwright Chromium/Chrome
```

The full static output remains `build/`; no backend or runtime asset service is
needed. Hexhaven's README includes controls, screenshots and verification data.

Both game headers use `src/styles/game-nav.css` for the portfolio mark, navigation
trail and controls. Hexhaven also consumes the site's colour tokens and local
fonts, and shares its persisted theme/accent and EN/SK preferences. Switch language
in its header, welcome dialog or settings; `/hexhaven/?lang=sk` opens in Slovak.
Appearance and language changes update the 3D scene and historic log without
changing the saved game.

## Brick break

A small LEGO fun fact in About links to the standalone `/lego/` page. It uses
React 19 and the same CSS tokens, fonts, Lucide icons and Vite build as the
portfolio. `lego/index.html` is just a document shell mounting the React app.
The game has its own copy-link button and return links to Games and the portfolio.

- `src/game/GameApp.jsx`: page composition, lazy workspace and error boundary.
- `src/game/components/`: collection, SVG previews, palette, toolbar and native dialogs.
- `src/game/state.js`: pure reducer, palette rules, undo/redo and completion scoring.
- `src/game/models.js`: the supplied game's 12 procedural models and placement checks.
- `src/game/persistence.js`: validated browser saves and backwards-compatible build codes.
- `src/game/hooks/`: persistence, timer, optional sound, keyboard input and the scene lifecycle.
- `src/game/scene/createStudio.js`: Three.js geometry, raycasting and camera controls.
- `src/game/i18n/`: keyed EN/SK dictionaries and a React locale provider.
- `src/game/Game.css`: game layout using the portfolio's shared design tokens.

Three.js loads only after a model or free building is selected. The collection
uses React SVG previews. The scene hook disposes renderers, geometries, materials,
controls, event handlers and animation frames when the workspace unmounts,
including React StrictMode remounts. WebGL failures show a retry control.

`?lang=sk` and `?lang=en` select the shared link's language. Switching language
updates React content in place and preserves the current build. Appearance falls
back to the visitor's portfolio preferences. Game translations stay out of the
portfolio bundle.

Progress, three sandbox slots and one recent build still use
`bricksmith.studio.v1` in local storage. Existing saves and `BS1.` export codes
remain compatible. Storage failures are visible and export stays available.
Sound is off by default.

```bash
pnpm test
pnpm build
```

Tests import the reducer and persistence modules directly, render real React
components in EN/SK through Vite, and exercise Three.js geometry, raycasting,
touch gestures and cleanup with the GPU boundary substituted. They also cover
all models at every difficulty and migration of existing saves. They do not
replace visual browser or real WebGL rendering tests.

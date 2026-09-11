# Brick Break

A standalone React and Three.js game at `/lego/`, with twelve procedural models
and free building. It shares the site's fonts, colours and navigation styles.

## Development

From the repository root:

```sh
pnpm dev                    # whole site at http://localhost:3000/lego/
pnpm dev:lego               # game only at http://127.0.0.1:4177/lego/
pnpm --filter lego test     # rules, saves, React rendering and scene lifecycle
pnpm build                  # complete production site
pnpm --filter lego e2e      # desktop/mobile browser checks against that build
```

## Structure

- `src/GameApp.jsx`: page composition, lazy workspace and error boundary.
- `src/components/`: collection, SVG previews, palette, toolbar and dialogs.
- `src/bricks.js`: brick shapes, colours, footprints and placement validation.
- `src/levels.js`: procedural model builders and the model catalog.
- `src/state.js`: reducer, palette rules, undo/redo and completion scoring.
- `src/matching.js`: position-independent model comparison.
- `src/persistence.js`: validated local saves and build codes.
- `src/hooks/`: persistence, timer, sound, keyboard and scene lifecycle.
- `src/scene/createStudio.js`: scene composition, raycasting and camera controls.
- `src/scene/brickResources.js`: brick geometry, materials and resource disposal.
- `src/i18n/`: EN/SK dictionaries and locale provider.
- `src/Game.css`: game layout using the shared site styles.
- `tests/`: unit/component/scene tests and the navigation browser suite.

Three.js loads when a model or free building is selected. The collection uses
SVG previews. Scene cleanup releases renderer resources, controls, event handlers
and animation frames, including React StrictMode remounts. WebGL failures show a
retry control. Both canvases render on demand, sleeping between edits once
camera damping and animations finish. Reduced-motion hints stay static.

## Compatibility

`?lang=sk` and `?lang=en` select the shared link's language. Switching language
preserves the current build. Appearance falls back to the visitor's portfolio
preferences. The game links back to `/games/` and the localized portfolio.

Progress, three sandbox slots and the recent build use `bricksmith.studio.v1` in
local storage. Existing saves and `BS1.` export codes remain compatible. Storage
failures are visible and export stays available. Sound is off by default.

Tests cover all models at every difficulty, scoring, translated components, save
migration, geometry, raycasting, touch gestures and resource cleanup. Browser
tests exercise the real WebGL workspace and header on desktop and mobile, in both
languages and themes.

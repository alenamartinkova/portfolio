# Performance improvements — 2026-09-11

## Measured changes

| Check | Before | After |
| --- | ---: | ---: |
| Forklift WebGL startup JavaScript, minified | 1,642,708 bytes | 1,274,361 bytes |
| Same JavaScript, gzip | 413,726 bytes | 318,139 bytes |
| Brick Break blueprint redraws during 60 hint animation frames | 60 | 0 |
| Office Escape scene renders while settling a level | 35 | 0 |

The Forklift comparison sums the Vite manifest's static dependency closure of
`index.html` and `src/start.ts`, counting each JavaScript file once. Builds use
`pnpm --filter forklift exec vite build --manifest`. Gzip sizes are calculated
per file with Node's `gzipSync`; they are not measured network transfer times.
The startup saving measured on that date was 22.4% minified and 23.1% compressed.
As of 2026-09-12, Forklift uses only WebGL; the optional renderer and its shader
compiler assets have been removed from the game build.
The physics WASM and dynamically loaded shaders are outside this JS comparison.

The render counts are covered by the Brick Break scene test and the Office
Escape campaign traversal tests. Main-canvas hint animation still runs for all
60 frames; editing, rotating or peeling the blueprint redraws it as needed.
All ten Office Escape levels are traversed using actual physics after the new
settling procedure, without rendering the scene during that procedure.

## Other changes

- Babylon imports only the geometry builders used by Forklift and Office Escape.
- Office Escape reuses the initialized Havok module across levels, while each
  scene retains its own physics world. Failed module loads can be retried.
- Paused Forklift and Office Escape scenes retain the last rendered frame;
  resize and appearance/language changes invalidate it. Gameplay rendering is
  unchanged. Forklift's result screen also reuses its static frame.
- Forklift skips minimap redraws when movement is below a quarter of a minimap
  pixel. The Office Escape HUD caches DOM references instead of querying them
  every frame.
- Portfolio and Games scroll animation batches geometry reads and avoids
  rewriting unchanged CSS variables and data attributes. Animation effects and
  reduced-motion controls are retained.
- Fingerprinted game assets now have the same long-lived browser cache policy
  as portfolio assets. The `/:game/assets/*` rule follows the
  [Netlify header syntax](https://docs.netlify.com/manage/routing/headers/).
  This hosting change takes effect after deployment.

## Verification and limits

Production builds, SEO checks, TypeScript checks and all 201 existing tests pass.
Scene tests now also check independent blueprint rendering and GPU-free office
settling. Local browser checks covered production startup, navigation, pause,
appearance controls and portfolio scroll animation.

Chrome DevTools tracing was unavailable in this session. No Lighthouse score,
Core Web Vitals, FPS improvement or real-network load-time improvement is claimed.
No deployment was performed.

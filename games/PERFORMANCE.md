# Game performance requirements for agents

Apply these rules when adding or modifying any game, the `/games/` index, shared game code or its build configuration. Preserve gameplay, accessibility, keyboard/touch input, locale, appearance and reduced-motion support while optimizing.

## Loading and bundles

- Register every game in `games/catalog.js`. Production uses **one root multi-page build** (`pnpm build`) so engines, Havok WASM and fonts share cacheable URLs. Individual workspace builds are development conveniences; do not compose them into a release or overwrite the shared build afterward.
- Keep the `/games/` catalog and Brick Break collection free of Three.js, Babylon and physics modules. Load only the selected game's renderer. Use a visible loading/error boundary and let the browser paint it before scene construction.
- Use `shared/load-game.js` for standalone asynchronous application loading. Its `load` callback returns an application disposer. Stage expensive construction and physics settling without enabling controls on an incomplete scene. Cancel late work when the application is disposed.
- Avoid module waterfalls after an explicit selection: import related UI and renderer modules together. Do not eagerly preload every game from the catalog.
- Use canonical `/fonts/` assets and unicode subsets. Do not wait for every font to load before painting the UI. Preload only demonstrated critical resources.
- Run `pnpm check:game-performance` after the root production build. The check enforces engine-free catalog/collection entries, selected-route isolation, initial gzip budgets and one shared WASM URL. Report total gameplay transfer separately from the lightweight entry; lazy loading does not eliminate gameplay bytes.
- Keep the modular Three entry and explicit runtime/React chunk boundaries in the root build. A runtime helper placed inside React can make a non-React game download React; the dependency check covers dynamic gameplay imports too.
- New downloaded models must have a documented byte/triangle budget. Prefer meshopt/Draco GLB where measurements justify decoder cost; prefer KTX2/Basis for substantial textures. Match image resolution to displayed size. Lazy-load optional levels/audio. Existing games are procedural and need no model decoder.

## Rendering and physics

- Use `shared/render-loop.js` for Three.js: invalidate when visible state changes, stop when settled, and honor hidden tabs. Animations need a finite duration. A hint, hover, open dialog or unchanged blueprint must not keep a GPU busy.
- Keep the shared resolution cap: at most 1.5 million drawing pixels, density at most 1.25, animated frame limit 60. Respect reduced motion. Any higher budget needs measurements and visual justification.
- Babylon uses one AA path: 2× MSAA where supported, FXAA fallback otherwise. Shadows are off by default; Office route markers use emissive materials without a full-scene glow pass. Check both close-up detail and mobile legibility before changing quality.
- Instance repeated meshes. Merge static decoration by **material and spatial cell**, preserving culling. Keep collision bodies, breakable objects, moving parents, interactable/pickable objects and transparent surfaces independent. Dispose instance buffers as well as geometry/materials.
- Cache vectors, rays, colors, formatters, projected bounds and topology data. Update GPU buffers in place. Update HUD text/styles only when values change; charts follow sample cadence, not RAF.
- Reuse `shared/rounded-solid-data.js` for repeated Babylon rounded solids. Its scene-owned CPU cache is capped at 256 templates and returns private arrays: never share mutable position/UV arrays between meshes that can be baked or edited. During initial scene construction, batch Babylon material dirty notifications and restore the previous setting in `finally` before readiness/rendering.
- Rounded-solid normals, corner coefficients and triangle topology are precomputed in `shared/generated/rounded-templates.js`. Change the offline reference and run `pnpm generate:game-geometry` when topology changes; `pnpm build` checks reproducibility. Do not add a baked copy for every furniture dimension or preload every level. Preserve geometry-equivalence tests and the private mutable arrays returned to each mesh.
- Use the asynchronous `Level.create`, `Warehouse.create` and `ForkliftController.create` paths in production. Their generators share the same authored construction as synchronous physics tests. Add checkpoints inside new loops and delegate nested builders with `yield*`; returning an ordinary promise does not split synchronous geometry work. `shared/scene-construction.js` yields browser tasks after an 8 ms budget, including static merging and material preparation. This is a cooperative budget, not a guarantee that a shader/driver call or one large merge fits in 8 ms.
- Pass the shared loader's abort signal through each asynchronous start path. Keep inputs disabled until construction completes; reject resumed work on disposed scenes, restore engine/material state in `finally`, and dispose incomplete scenes on failure. Prepare Babylon materials incrementally before the final readiness check, without advancing gameplay physics or rendering a partial level.
- Keep deterministic fixed-step physics and existing collision semantics. Sleep only when all relevant bodies are settled and no timed gameplay condition requires stepping. Wake on keyboard, touch, camera, state and visibility changes. Preserve mission clocks during idle intervals.
- **Havok animated-body targets must still be submitted each active physics step.** Skipping an unchanged forklift target can retain the preceding velocity and move the load. Reduce whole-scene idle work instead. Real physics integration tests guard this contract.
- Do not disable culling, lower physics precision or introduce LOD/workers merely to meet a number. Profile the actual bottleneck and verify gameplay/visual quality.

## Lifetime and validation

- Own and clean up RAFs, timers, observers, listeners, workers, audio nodes/contexts, controls, renderers, render targets, instance buffers and textures. Make disposal idempotent. Handle imports completing after disposal. Retain BFCache pages on persisted `pagehide`.
- Texture caches need bounded scene/application ownership. Replacing a board must release resources when the last owner leaves. A hidden optional reference view must not allocate a second renderer until first used.
- When permanently retiring an owned Three renderer, dispose application resources and the renderer, then call `forceContextLoss()`. This releases driver-owned default resources without waiting for detached canvases to be garbage-collected. Remove context-loss recovery handlers first; never do this for a temporary pause or a shared renderer still in use.
- Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, and the relevant browser checks (`pnpm e2e:games`, `pnpm e2e`). Test desktop and touch, normal/reduced motion, pause/resume, hidden tabs and repeated scene replacement.
- Compare production measurements for **all six games** when shared code changes: `/office-escape/`, `/forklift/`, `/lego/`, `/hexhaven/`, `/deploy-friday/`, `/cable-management/`, plus `/games/`. New games extend this list via the catalog.
- Record hardware/browser, viewport/DPR, cache/throttling, scenario, LCP/TBT, JS transfer, draws/frame, rendered FPS, callback CPU time and any memory limitations. Keep before/after scenarios comparable. Distinguish RAF frequency from frames actually rendered, and CPU submission time from GPU time. Never invent missing numbers.
- Existing dynamic gameplay can legitimately run at 60 FPS. Catalog, paused views and settled puzzles should produce **zero draw calls**; guard wake-up behavior as carefully as sleep. Check the heaviest available level/board as well as the opening scene.
- Keep the shared FPS meter connected to actual scene submissions, once per game frame (not per pass or reference view). Its UI samples once per second, stops its timer when settled/hidden, and must never wake rendering. In Babylon chase cameras, follow the post-physics pose that will be drawn to avoid one-frame tracking jitter.

Do not publish or commit without the user's authorization. Document remaining tradeoffs and measurements in the change report.

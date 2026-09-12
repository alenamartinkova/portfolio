# Games performance implementation results

12 September 2026. Covers the catalog and all six games: Office Escape, Forklift Certified, Brick Break, Hexhaven, Deploy Friday and Cable Management. No commit or deployment was made.

## Outcome

The catalog is prerendered and remains free of game engines. All game entries now share one production build, with reusable engine chunks, fonts and Havok WASM. Standalone games display a loading state before expensive initialization. Brick Break's ordinary idle view and a settled Forklift scene now stop drawing. Cable Management and Deploy Friday use substantially fewer draw calls; Office Escape submits fewer draws and triangles. Resource ownership, teardown and performance regression checks were extended.

These changes do **not** make every measurement smaller. Cold gameplay gzip sizes increased slightly for some games because shared chunks include code used across consumers and introduce chunk overhead. Lighthouse TBT is higher in several routes after first paint was moved earlier. Active Hexhaven CPU timing did not improve in the measured sample. These tradeoffs and remaining limits are recorded below.

Agent requirements are in [PERFORMANCE.md](PERFORMANCE.md), referenced by the root [AGENTS.md](../AGENTS.md).

## Measurement method

- Production build served locally by Vite preview; Apple M1 Max, macOS/Darwin 25.6.0, Chrome 152, Lighthouse 13.4.1, Node 24.3.0.
- Desktop 1280 × 900, DPR 1, English, no network/CPU throttling. Lighthouse uses a fresh Chrome profile per route. Each timing is one accepted run, not a median or field percentile.
- Decimal kB/MB. Gzip is calculated independently over emitted JavaScript; observed wire bytes include HTTP overhead and may differ.
- Runtime samples instrument native WebGL calls, draw-bearing RAF callbacks and CDP main-thread task duration. They do not measure actual GPU execution time, utilization or power consumption.
- Load/runtime tables were captured after the shared-build optimization. A final disposal-only change then added explicit WebGL context release; its five-cycle resource test and the final bundle inventory were measured separately. That final change adds 151 raw / 52 gzip bytes across the unique output graph. Startup/runtime timing was not rerun for those teardown-only calls.
- Browser tests additionally cover mobile viewport/touch behavior. They are not measurements on a physical low-end phone.

## Load baseline and after measurements

Lighthouse observes initial navigation. Brick Break's row is its collection; selecting a model loads more JavaScript. LCP is a text/UI metric and does not establish that the game is ready.

| Route | LCP before → after, ms | TBT before → after, ms | JS wire before → after, kB | Total wire after, kB |
|---|---:|---:|---:|---:|
| `/games/` | 577 → 49.5 | 0 → 0 | 76.9 → 74.7 | 188.7 |
| `/office-escape/` | 866 → 171.2 | 288.8 → 505.7 | 506.2 → 505.0 | 2715.5 |
| `/forklift/` | 442 → 46.5 | 261.8 → 460.6 | 504.5 → 507.5 | 2719.4 |
| `/lego/` collection | 319 → 108.9 | 0 → 0 | 81.9 → 87.3 | 199.9 |
| `/hexhaven/` | 1253 → 72.4 | 0 → 37.4 | 175.0 → 190.5 | 306.8 |
| `/deploy-friday/` | 205 → 324.8 | 0 → 125.8 | 148.9 → 164.5 | 280.4 |
| `/cable-management/` | 172 → 201.3 | 0 → 34.8 | 132.0 → 146.2 | 260.9 |

The earlier shell paint changes the TBT measurement window: work previously occurring before first contentful paint can now contribute to TBT. This matters particularly for the old Hexhaven result, which had a 1034 ms pre-paint startup task despite 0 ms TBT. Nevertheless, the higher measured TBT and Deploy/Cable LCP are real reported results; a faster loading shell does not establish that initialization has become cheap.

Separate first-WebGL-draw measurements, from navigation start: Office **632.2 → 574.2 ms**, Forklift **614.2 → 595.3 ms**, Hexhaven **343.2 → 162.0 ms**, Cable **173.8 → 130.8 ms**. Deploy's successful after sample was **151.9 ms**; the original equivalent navigation sample failed and is not compared. First draw is an early submission, not controls-ready or completed shader compilation. Brick Break's explicit model-click-to-first-draw follow-up measured **442 → 416.6 ms**, including automation click dispatch. These single samples are not statistically established percentage improvements.

### JavaScript and assets

The lightweight static entry is separate from the complete selected-game download. Do not use the shell size as the game's total payload.

| Route | Static entry gzip after, kB | Loaded JS before, raw / gzip kB | Loaded JS after, raw / gzip kB |
|---|---:|---:|---:|
| Games catalog | 70.8 | 231.5 / 75.5 | 216.4 / 70.8 |
| Office Escape | 9.9 | 1911.3 / 480.1 | 1902.7 / 481.2 |
| Forklift Certified | 10.4 | 1910.1 / 480.7 | 1910.4 / 483.7 |
| Brick Break collection | 83.9 | 254.8 / 81.4 | 256.9 / 83.9 |
| Brick Break including studio | — | 808.8 / 223.5 | 816.5 / 233.0 |
| Hexhaven | 3.2 | 647.4 / 174.0 | 657.4 / 184.4 |
| Deploy Friday | 2.9 | 559.4 / 148.0 | 571.3 / 158.4 |
| Cable Management | 2.9 | 509.3 / 131.1 | 524.5 / 141.4 |

Final emitted JS reachable from the catalog and games, including optional dynamic imports, has a **unique union of 3,526,417 raw / 957,575 gzip bytes**. The original independently emitted route totals summed to approximately 7.44 MB raw including the catalog. This is output deduplication across routes, not a first-game download reduction. Optional Babylon shader/loader output must not be added to initial transfer.

Largest final chunks:

| Chunk | Raw bytes | Gzip bytes |
|---|---:|---:|
| Shared Babylon `defaultRenderingPipeline-IehfNpsK.js` | 1,003,547 | 249,083 |
| Shared Three core `Raycaster-D5c8TJoS.js` | 476,374 | 120,943 |
| Shared React `react-q75k1-q7.js` | 190,181 | 59,087 |
| Babylon `cubemapToSphericalPolynomial-B3jFNTgZ.js` | 156,934 | 38,106 |

The build uses one modular Three entry. A separate runtime chunk prevents a bundler helper from making Babylon games depend on React. Route checks cover both eager entries and React leakage through dynamic dependencies. Neither the catalog nor Brick Break collection loads an engine.

- Havok remains **2,094,563 raw bytes**, now at one fingerprinted URL. The audit measured deployed Brotli transfer at **608,140 bytes**; deployment was not changed or remeasured here. Vite preview sends the binary uncompressed, inflating local totals.
- The three Latin WOFF2 files total **102,092 raw bytes**: Inter 48,432; Space Grotesk 22,320; JetBrains Mono 31,340. All routes use canonical `/fonts/` URLs. Hexhaven no longer eagerly requests the two extra Latin-ext files, which previously added 30,520 bytes in English.
- A sequential Office → Forklift browser check reused the shared Babylon chunk and Havok response body. Preview revalidated these resources with approximately 300 bytes of response overhead each; production immutable caching is governed by the existing hosting headers.
- There are still no downloaded game models, image textures or audio files. No Draco/meshopt decoder or KTX2 pipeline was introduced for procedural assets. Hexhaven's grain is one reusable 128² neutral canvas tinted by materials, instead of repeated 512² noise generation per color.

## Runtime before and after

Draw counts are medians per draw-bearing callback in the stated scenario. Triangles count submitted triangle primitives, including multiple render passes. Idle means settled with no user interaction; it does not mean a running timer/security scene must stop.

| Game/scenario | Draws before → after | Submitted triangles before → after | Idle behavior after |
|---|---:|---:|---|
| Office, playing without input | 884 → **573** | 1,156,764 → **393,644** | Intro and pause: zero draws; active game remains ~60 FPS |
| Forklift, W held | 727 → **642** | — → 224,696 | Settled scene: **0 draw FPS**, previously 59.8 FPS / 736 draws per frame |
| Brick Break, easy workspace | 10 → **0 idle draws** | 42,670 per old idle frame → 0 | Finite hint pulse then sleep; camera/edit input wakes rendering |
| Hexhaven, camera orbit | 36 → **36** | 17,869 → **17,869** | Menu/game idle: zero draws |
| Deploy Friday, early wave | 89 → **13** | 1,752 → **1,752** | Planning/pause: zero draws |
| Cable Management, scripted pointer interaction | 231 → **59** | 10,964 → **10,964** | Settled cables, unchanged hover and drawer: zero draws |

Cable's interaction trace includes settling and is not guaranteed to be a continuous valid drag. Its after value of 45.2 draw-bearing callbacks/s is therefore not an active-game FPS ceiling. Brick Break's after orbit sample, with the help dialog closed, submitted 11 draws and 45,834 triangles; it is not the same scenario as the old idle hint sample.

| Comparable scenario | Median / p95 callback CPU before → after, ms | Main-thread task time before → after, ms per ~2 s |
|---|---:|---:|
| Office, playing without input | 3.8 / 4.1 → 3.7 / 4.0 | 468.0 → 455.5 |
| Forklift, settled idle | 4.5 / 5.0 → no rendered callbacks | 545.9 → 0.7 |
| Forklift, W held | 4.5 / — → 4.3 / 4.7 | 576.0 → 573.0 |
| Brick Break, easy idle | 0.4 / 0.6 → no rendered callbacks | 81.8 → 9.7 |
| Hexhaven, orbit | 0.6 / 1.4 → 1.0 / 1.7 | 203.2 → 302.2 |
| Deploy Friday, early wave | 0.5 / 5.7 → 0.5 / 2.1 | 257.5 → 158.5 |
| Cable, pointer sequence | 0.7 / 1.6 → 0.6 / 1.6 | 246.3 → 261.0 |

Submission counts decreased much more than CPU time in Office. Hexhaven and Cable did not show lower total task time in these single samples. No claim of a universal CPU/GPU percentage improvement follows from this table.

### Resource lifetime follow-up

Five repetitions were measured using instrumented WebGL create/delete calls and context-loss events. Counts exclude lost contexts; they are API object counts, not VRAM bytes. Instrumentation retains references deliberately, so it tests explicit release independently of garbage collection.

| Scenario | Result after five cycles |
|---|---|
| Brick Break open model → return to collection | Each studio: 2 contexts, 51 buffers, 8 textures; each return: **0 contexts and 0 live tracked objects** |
| Hexhaven new board with a different seed | Stable **1 context, 198 buffers, 15 textures, 12 programs, 38 VAOs** |
| Cable untangle → drawer → untangle | Stable **1 context, 220 buffers, 4 textures, 3 programs, 53 VAOs** |

Before the final explicit context-release fix, geometry/program cleanup worked but old contexts retained driver-default textures pending collection. `forceContextLoss()` now runs only when permanently retiring an owned renderer, after cleanup. This is also covered by browser regression assertions. No application errors were observed in the successful runtime or resource samples. A multi-hour memory soak, GPU heap profiling and equivalent lifetime counters for Babylon/Deploy are not measured.

## Coverage of the audit findings

| Audit IDs | Implementation |
|---|---|
| G1 | Brick Break hints pulse for 800 ms, then remain static. Paused/dialog and reduced-motion behavior stop animation. |
| G2, C1 | Office glow pass removed; emissive markers retained. Both Babylon games select 2× MSAA or an FXAA fallback, instead of stacking 4× MSAA and FXAA. |
| G3–G4 | Cable hover no longer wakes physics. Cable joints/segments are instanced; drawer geometry and previews are cached; crossing DOM markers are pooled; scratch vectors and projected dimensions are reused. |
| G5, C5 | Hexhaven menu paints before asynchronous preview construction. Grain is shared and tintable; unnecessary font waits are removed. Deploy/Cable use lightweight application loaders with visible loading/error states. |
| G6, G9 | Office/warehouse decoration is merged by material and spatial cell. Dynamic ancestors, colliders and excluded interactables remain independent. Rounded geometry and tube/cylinder tessellation were reduced; culling is retained. |
| G7, G13 | Deploy's 77 tiles use one instanced mesh with cell picking. Paths, packet colors, matrices, line buffers, currency formatters and unchanged HUD/chart values are reused or updated at simulation cadence. |
| G8 | Forklift sleeps rendering and physics after the relevant scene settles; input/state changes wake it. Idle audio suspends and a 1 Hz clock preserves mission time. Zero-force writes are skipped. **Unchanged Havok animated-body targets are still submitted during active steps**: skipping these failed real cargo tests and was rejected. |
| G10 | Office nearest-body selection uses one squared-distance pass. Camera rays, vectors, physics/audio movement values and static ray results are reused. |
| G11 | Brick Break starts UI/studio imports together on model selection. The reference renderer is created only when its view has nonzero visible size. Two renderers remain when both views are visible; a single multi-viewport renderer was not necessary for the selected fix. |
| G12, C7 | Explicit instance-buffer disposal, refcounted texture ownership, scoped listeners, late-import cleanup and owned renderer context release. Shared loading/disposal respects persisted BFCache navigation. |
| C2 | Shared paint/loading/error/ready lifecycle. Office physics settling preserves the same 35 steps in seven yielding batches; controls remain unavailable until ready. Large synchronous scene construction and shader/WASM work still remain. |
| C3 | One root multi-page production graph, shared engine chunks and one Havok URL; independent development servers still work. |
| C4 | Prerendered catalog hydrates stored/query locale and theme. Catalog dictionaries are separated from portfolio copy; shared appearance controls use a lightweight locale context. |
| C6 | Canonical fonts retain unicode subsets and existing visual typography. No speculative eager loading of every game or extra font families was added. |

Conditional proposals were resolved using the audit's alternatives: a delayed reference renderer instead of a mandatory single-renderer rewrite; spatial batching and simpler geometry without speculative LOD; reusable generated grain without a compressed-texture decoder. Physics precision and deterministic rules were preserved.

## Validation and remaining boundaries

- `pnpm test`: all workspace suites passed; 26 Brick Break tests rerun after context disposal. Root performance-policy tests: 18 passed. Forklift includes 59 tests with real Havok integration and batched warehouse geometry.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm check:game-performance`: passed. The build still reports a large Babylon chunk warning; its measured size is listed above.
- `pnpm e2e:games`: 14 production tests across desktop/mobile, covering every route, static catalog content, Slovak/light hydration, idle/wake/pause and resource teardown.
- `pnpm e2e`: 9 passed, 2 platform-specific skips across Hexhaven and Brick Break.
- `pnpm e2e:responsive`: 36 passed, 14 platform/scenario skips. Includes narrow portrait, landscape/tablet, touch controls, Cable's evenings/daily puzzle, Hex trade, Brick edits/undo and Forklift garage/later level.
- Existing browser tests were aligned with current navigation/settings selectors and game development favicon serving. Screenshots were refreshed by those tests. Existing unrelated portfolio edits were preserved.
- Performance guards enforce lightweight entry budgets, engine-free catalog/collection, no eager foreign-game code, no React in non-React gameplay graphs, one WASM URL, canonical fonts and prerendered titles.

Remaining performance work should be driven by profiling: further break up Babylon scene/material construction, measure low-end physical devices and throttled connections, evaluate cold-game chunk overhead, and inspect the most populated late-game scenes. No measured claim is made about production field percentiles, actual GPU time/power/VRAM, exact active/sleeping Havok body counts or worst-case campaign FPS. Early first paint and zero idle rendering do not remove all active-game costs.

Raw Lighthouse reports, runtime samples, module inventories, resource checks, scripts and validation logs are retained in the [local measurement evidence](/Users/alenamartinkova/.codex/visualizations/2026/09/12/01a0973c-ce8a-7b20-bbb7-bfd14b7fcbe2/games-performance-implementation/evidence/README.md). The [original audit](/Users/alenamartinkova/.codex/visualizations/2026/09/12/01a0973c-ce8a-7b20-bbb7-bfd14b7fcbe2/games-performance-audit/games-performance-audit.md) retains the baseline sources and measurements. These artifact links are local to this audit workspace.

## FPS display and Forklift follow-up

A subsequent requested change adds the shared `shared/fps-meter.js` badge to all six games, including Brick Break's collection. It counts submitted scene frames once per game frame, not render passes or reference-view renders. The display updates once per second, reaches zero when settled, and stops its timer when settled or hidden. It owns no animation loop and cannot wake game rendering. The earlier benchmark tables above predate this follow-up.

Forklift's chase camera now updates in Babylon's pre-render observer, after the physics step. Previously the camera aimed at the preceding truck pose while rendering the newly simulated truck/cargo pose. This removes a one-frame tracking discrepancy without changing the 120 Hz physics substeps, cargo targets, rendering budget or controls. It is a correction to motion synchronization, not a claim that all low-FPS or device-specific stutter has been eliminated.

The follow-up passed the build/type/lint checks, the 59 Forklift tests and all 14 desktop/mobile production game checks, including visible FPS, active nonzero readings and settled zero readings. A missing HUD stub in the existing isolated loop test fixture was corrected; gameplay behavior was not weakened to satisfy that fixture.

A separate desktop 1280×900, DPR 1 browser run showed 30–31 FPS while driving, 30 FPS while reversing/lifting, and 0 FPS settled/paused. Independent instrumentation recorded 126 rendered callbacks out of 126 available callbacks in each roughly four-second active sample. Crucially, the empty-page calibration in the same browser run was **30.22 RAF callbacks/second**: this run was limited by browser/environment cadence, not proven to be a 30 FPS game limit. Median/p95 submission callback CPU was 5.7/6.4 ms while driving and 5.4/6.2 ms while reversing/lifting. These conditions differ from the earlier ~60 Hz audit; they cannot establish an FPS regression or a universal fix for the reported stutter.

## Further initialization work

A subsequent startup optimization removes repeated vertex calculations for identical rounded solids in Office Escape and Forklift. Both implementations use a shared, scene-owned CPU template cache, limited to 256 shapes. Every mesh still receives private position, normal, index and UV arrays, so transform baking and UV projection cannot corrupt another mesh. Templates are released when their scene is disposed. The cache trades bounded CPU memory for less construction work; it does not share physics bodies or change geometry detail.

Both scene builders also defer Babylon's global material-dirty updates during construction, restoring the previous setting in `finally` before readiness checks/rendering. Office's generated textures write directly to their typed pixel arrays instead of allocating a temporary array for every pixel. Shader features, texture resolution, physics cadence and visual settings are unchanged.

Three before and three after navigations per game used fresh browser contexts in local production preview, Chrome, 1280×900, DPR 1, no CPU/network throttling. Browser/driver caches can still affect timings. The following are medians, not production percentiles; startup values are independently observed in page instrumentation rather than inferred from LCP.

| Metric | Office before → after, ms | Forklift before → after, ms |
|---|---:|---:|
| First WebGL draw submission | 642.9 → 582.6 | 625.4 → 573.8 |
| Loading shell removed | 643.6 → 583.4 | 579.1 → 524.2 |
| Longest observed startup task | 455 → 397 | 250 → 217 |

First draw ranges: Office 626.3–658.7 → 579.2–599.8 ms; Forklift 623.6–636.1 → 563.5–576.1 ms. No application errors occurred in these samples. Shell removal and first draw are different milestones; neither guarantees that every optional shader has finished compiling. Large synchronous construction tasks still remain, so the next larger changes would be chunking level construction and reducing or precomputing more procedural scene work. These remaining costs are not described as solved by the cache.

Unit/integration tests, type checks, production build and lint passed. New geometry tests verify bounds, normals, winding and isolation of mutable arrays; existing real Havok tests continue to cover cargo and collisions.

All 14 production desktop/mobile game checks also passed after the initialization changes. The [before/after measurements](/Users/alenamartinkova/.codex/visualizations/2026/09/12/01a0973c-ce8a-7b20-bbb7-bfd14b7fcbe2/games-initialization-followup/summary.json), raw samples and validation logs are retained alongside the measurement script in that local artifact directory.

# Incremental game initialization — 13 September 2026

Office Escape and Forklift now build their worlds in cooperative tasks, including furniture, architecture, warehouse racks, truck assemblies, static merging and material preparation. Repeated rounded-solid topology is precomputed offline. Inputs remain disabled until construction completes, and abandoning a load cancels further allocations.

The measured improvement is responsiveness during startup. In three final starts per game, the Long Tasks observer reported no task above 50 ms. Total loading duration increased slightly; this change must not be described as a shorter overall startup.

## What changed

- `shared/generated/rounded-templates.js` contains precomputed normals, core-corner coefficients and indices for the two existing rounded-solid topologies. Runtime only fits their positions to dimensions/radius and projects material UVs. The generated source is 19,178 bytes, 2,320 bytes when gzip-compressed in isolation. It is shared by both Babylon games and loaded with their gameplay code.
- `pnpm generate:game-geometry` regenerates templates from the offline reference in `scripts/lib/rounded-solid-reference.mjs`. The production build checks that the generated file is current. Geometry-equivalence tests cover thin/large shapes, both tessellations, clamped radii, winding and mutable-array isolation.
- This precomputes reusable geometry templates, **not complete exported levels**. Ordinary boxes, spheres, tubes, cylinders, authored transforms, labels, UV projection, colliders, GPU uploads and merging still happen at runtime. No per-level model download was added. The existing scene-owned cache remains bounded at 256 dimension/radius combinations.
- `shared/scene-construction.js` runs generator builders with an 8 ms cooperative work budget and yields a browser task through MessageChannel, avoiding nested timer clamping. The budget is checked at explicit checkpoints; one engine call, allocation/GC pause, shader/driver operation or merge can still exceed it on slower hardware.
- Office's `Level.create` and Forklift's `Warehouse.create`/`ForkliftController.create` use the staged path. The synchronous constructors drain the same generators for physics tests/tools, preserving one authored definition. Static decorations retain material/spatial-cell grouping; the truck retains grouping by material and animated/optional parent. Physics cadence and the 35 Office settling steps are unchanged.
- After restoring Babylon's material-dirty setting, material readiness is prepared incrementally using the active camera's render pass. The pass is restored before every yield. The normal scene readiness check remains authoritative.
- The shared loader passes an abort signal through game startup. Disposal cancels work after imports/WASM/scene yields, removes listeners, closes generators, and disposes partial scenes on failure. Permanent `pagehide` cancels; persisted BFCache navigation is retained. Inputs/rendering do not advance the unfinished level.

## Matched startup measurements

Baseline: commit `32172f2`, built in an isolated temporary checkout. Final: this working tree's root production build. Native Chrome 152, Apple M1 Max / ANGLE Metal, macOS, 1280×900 CSS pixels, DPR 1, local Vite production preview, no CPU/network throttling. Three navigations per game with fresh browser contexts. No build or browser test ran concurrently with these final samples. Browser/OS/driver caches can still affect results; these are local lab samples, not field percentiles.

| Metric | Office Escape before → after | Forklift before → after |
|---|---:|---:|
| Loading shell removed, median | 518.4 → 588.5 ms | 484.5 → 574.0 ms |
| Shell removal range | 505.2–541.9 → 588.3–602.9 ms | 475.1–485.4 → 573.7–574.1 ms |
| Longest reported startup task, median | 317 ms → none above 50 ms | 186 ms → none above 50 ms |
| Reported long tasks in each of three starts | 1 / 1 / 1 → 0 / 0 / 0 | 2 / 2 / 2 → 0 / 0 / 0 |
| Application errors | 0 → 0 | 0 → 0 |

The longest after-task duration is **not measured**: Long Tasks only reports tasks over its threshold, so zero records does not mean zero CPU work or a measured 8 ms maximum. Shell removal is an observable loading milestone, not proof that all optional shader compilation has completed. First WebGL submission is retained in the raw samples but is not used as a gameplay-ready metric: texture/material preparation can submit offscreen draws earlier.

Total shell duration rose by 70.1 ms for Office and 89.5 ms for Forklift. Precomputed topology removes normal/topology calculations, but no isolated end-to-end speedup is claimed for that part. Cooperative scheduling and incremental readiness have overhead; preserving interface responsiveness is the demonstrated gain.

## All-route production comparison

One additional browser run per route/version, fresh contexts with HTTP cache disabled, same viewport/hardware and no throttling. LCP is the browser PerformanceObserver value for page/UI content; it does not measure 3D readiness. Lighthouse and Lighthouse TBT were not rerun for this follow-up. JS values below are actual encoded response-body bytes observed in Resource Timing, excluding headers and Havok WASM. “Selected gameplay” includes entering Brick Break's first model and Hexhaven's game. Entry gzip is an independently compressed static import graph, not total gameplay transfer.

| Route | LCP ms, before → after | JS first load bytes, before → after | JS selected gameplay bytes, before → after | Entry gzip bytes, before → after |
|---|---:|---:|---:|---:|
| /games/ | 64 → 72 | 71,280 → 71,280 | 71,280 → 71,280 | 70,818 → 70,818 |
| /office-escape/ | 144 → 136 | 486,407 → 490,103 | 486,407 → 490,103 | 10,556 → 10,550 |
| /forklift/ | 44 → 40 | 488,817 → 492,532 | 488,817 → 492,532 | 11,099 → 11,087 |
| /lego/ | 108 → 108 | 84,753 → 84,753 | 234,008 → 234,008 | 84,574 → 84,574 |
| /hexhaven/ | 228 → 228 | 185,761 → 185,773 | 185,761 → 185,773 | 3,899 → 3,911 |
| /deploy-friday/ | 200 → 200 | 160,205 → 160,215 | 160,205 → 160,215 | 3,578 → 3,587 |
| /cable-management/ | 176 → 176 | 142,919 → 142,929 | 142,919 → 142,929 | 3,557 → 3,568 |

Catalog and all six games submitted zero draw calls while settled in these samples. Active measurements below are roughly two-second scenarios; FPS counts submitted render callbacks, not GPU completion. The blank/settled intervals do not continually animate. CPU values measure callback submission time, not GPU execution; single short samples cannot establish a stable CPU gain/regression. Minor differences in moving-view draw counts reflect sampling positions.

| Game/scenario | Rendered FPS before → after | Draws/frame median before → after | Callback CPU median / p95 ms before → after |
|---|---:|---:|---:|
| office-escape — W held | 60.1 → 60.1 | 576 → 576 | 3.6 / 4.1 → 3.3 / 3.6 |
| forklift — W held | 60.1 → 60.6 | 641 → 642 | 4.1 / 4.6 → 4.1 / 4.4 |
| lego — orbit interaction | 60.4 → 60.3 | 11 → 11 | 0.3 / 0.6 → 0.3 / 0.6 |
| hexhaven — orbit interaction | 60.3 → 60.2 | 36 → 36 | 0.5 / 1.2 → 1.0 / 1.5 |
| deploy-friday — wave running | 59.7 → 59.7 | 13 → 13 | 0.3 / 1.7 → 0.5 / 2.2 |
| cable-management — pointer interaction | 45.3 → 45.1 | 59 → 59 | 0.6 / 1.5 → 0.5 / 1.6 |

There were no application errors in either all-route run. Active triangle counts are retained in the raw comparison. Geometry/detail settings, antialiasing and resolution budgets were preserved. Process/GPU memory peaks and GPU timing were not measured; sampled JS heap sizes are available in the raw data and are not a leak test.

## Validation and maintenance

- Root production build, type checks, geometry freshness, bundle/isolation budgets and lint passed.
- 329 unit/integration checks passed across the full suite and focused reruns. They cover scheduler order/cancellation, render-pass restoration, geometry equivalence, real Havok traversal of all 10 Office routes at 30/60 FPS, all 14 staged warehouse layouts, and staged truck geometry/motion. Existing cargo lift/delivery, camera and lava regression checks remain intact.
- All 20 desktop/mobile production checks passed after scene/truck staging, including cancellation during WASM loading. All 10 affected production checks passed again after final material preparation. Workspace browser suites passed (Hexhaven: 7 passed / 2 skipped; Brick Break: 2 passed). Responsive physics/garage checks passed across viewport projects after a focused rerun: the layout fixture now explicitly waits for visible touch input before reading rectangles, because the pause overlay can be hidden during staged loading. Geometry/layout assertions were retained.
- Performance instructions for future agents are updated in [PERFORMANCE.md](./PERFORMANCE.md). Production callers must await the asynchronous creation paths, put checkpoints inside new expensive loops, preserve cancellation and test heavy levels and touch input.

No commit or deployment was made.

Raw measurements, scripts, CPU profile and logs: [local evidence](/Users/alenamartinkova/.codex/visualizations/2026/09/12/01a0973c-ce8a-7b20-bbb7-bfd14b7fcbe2/games-staged-initialization).

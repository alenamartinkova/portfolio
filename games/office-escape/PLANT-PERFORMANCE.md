# Shared plant models

14 September 2026. This comparison starts with the previous crate/rack and literal-label optimizations already applied. Only Office Escape's plant construction changed.

## Results

The First Evening opening scene submits **33.5% fewer draw calls** and allocates **52.0% fewer WebGL buffer bytes**. Its measured loading-shell duration falls by 17.0%. Geometry detail, materials, rendering resolution and independent pot physics are retained.

| Before → after | First Evening (20 plants) | Rolling Stock (control, no plants) |
| --- | ---: | ---: |
| Draw submissions/frame, median | 576 → 383 | 256 → 257 |
| Mean draws/frame | 568.3 → 376.0 | 251.7 → 258.0 |
| Live WebGL buffers | 3,762 → 2,111 | 1,590 → 1,590 |
| Allocated buffer bytes | 17,079,324 → 8,204,860 | 9,532,912 → 9,532,912 |
| Live WebGL textures | 19 → 19 | 18 → 18 |
| Callback CPU median / p95, ms | 3.7 / 4.3 → 3.1 / 3.6 | 2.1 / 2.9 → 2.1 / 2.7 |
| Loading shell removed, median ms | 578.8 → 480.4 | 380.9 → 377.0 |
| LCP median, ms | 120 → 112 | 116 → 112 |
| Submitted triangles/frame, median | 394,054 → 419,222 | 200,188 → 200,188 |
| Submitted FPS | ≈60 → ≈60 | ≈60 → ≈60 |

Every idle and paused measurement submits zero draws, and all twelve navigations complete without application errors. Rolling Stock's geometry and resources are unchanged; small draw/timing differences in that control are sample variability, not an attributed improvement.

**Culling tradeoff:** merging the stems and each leaf color within a plant increases submitted triangles by 6.4% in this view. A visible leaf cluster can include individual leaves that were previously culled at the edge of the view. Plants remain independently culled; they are not merged across the room. CPU submission improved on the measured machine, but GPU time and low-end physical mobile performance were not measured. The result is not a claim of higher FPS on every device.

## Implementation

- `PlantModels` builds five scene-owned decoration templates: rim, soil, stems and two leaf colors. Subsequent pots use ordinary Babylon instances with their own parent transforms and bounds. The 20 plants now have 120 mesh nodes instead of 420, backed by six geometries instead of 420.
- Each pot remains a visible, independently pickable `Mesh` with shared immutable cylinder geometry, the original collider bounds and a separate 8 kg Havok body. Pushing, tipping, dragging and resetting do not copy another pot's pose. No per-frame synchronization loop was added.
- Merging happens in pot-local coordinates. Leaf normals use inverse-transpose transforms to preserve the original shading of non-uniformly scaled leaves; the default position-matrix normal transformation in `Mesh.MergeMeshes` would change their lighting. Materials, winding, vertex positions and shadow-reception flags are preserved.
- Templates live for the whole level, like their source pot. Construction retains generator checkpoints and the existing cancellation/disposal path. The map-free cache holds only one pot and five decoration sources and clears on scene disposal. Individual source-pot removal would require a different ownership policy; current gameplay resets pots and disposes whole scenes.
- No downloaded models, new textures, decoders, quality reduction or shared-runtime changes were introduced. The root production gameplay JavaScript response grows from 496,276 to 496,647 encoded bytes (+371). The shared Havok response remains 2,094,563 bytes. Entry/route budgets remain distinct from these gameplay transfers.

## Method and visual checks

MacBook Pro, Apple M1 Max, 32 GB RAM, Darwin 25.6.0 arm64; installed headless Chrome 152. Root production builds served by local Vite preview. Viewport 1280 × 900, DPR 1; three fresh browser contexts per route/version, HTTP cache disabled, no CPU/network throttling. Measurement runs had no concurrent builds or test suites. Browser/driver caches were not purged.

Each run waits for loading-shell removal and settling, samples 600 ms idle, presses Play, holds W for 2.2 seconds, and pauses for another 600 ms sample. Draw/triangle/CPU statistics pool rendered callbacks; readiness, LCP and FPS use medians of run values. First Evening was the heaviest opening view and largest buffer allocation in the earlier ten-level screen. Rolling Stock is an unchanged control; route traversal tests cover all ten levels.

First Evening readiness ranges: 576.5–586.9 ms before, 474.2–483.7 ms after. Rolling Stock: 378.1–387.9 ms before, 375.1–387.3 ms after. No startup Long Tasks were observed in these runs. Lighthouse TBT was not measured; LCP is a UI paint metric, not game readiness. CPU values exclude asynchronous GPU execution. Buffer bytes are requested WebGL storage, not total VRAM; texture bytes, driver overhead and controlled heap usage were not measured.

The compared initial First Evening screenshots differ at 18 of 1,152,000 pixels after preserving normals. Mean absolute RGB-channel difference is 0.000122 on a 0–255 scale; the largest single-channel difference is 151 at an edge pixel. They preserve the same visible appearance but are not pixel-identical. Rolling Stock screenshots are pixel-identical. The geometry test separately compares transformed triangles, normals, materials and shadow flags against the original authored plant.

## Validation

- Root `pnpm build` passed, including geometry reproducibility, all game type checks, SEO and `check:game-performance`. Final `pnpm typecheck`, `pnpm lint` and `git diff --check` passed.
- `pnpm test`: 364 passed, including all ten Office routes at 30/60 FPS. New real-Havok tests cover independent pot bodies, impulses/tipping, dragging selection, reset, shared-resource disposal, and instance culling when the source plant is outside the view. An authored-geometry comparison checks transformed triangles, normals, materials and shadow flags.
- `pnpm e2e:games`: 29 passed, 2 intentional skips; one unrelated Forklift cancellation case encountered a missing Playwright trace during teardown because a concurrent responsive suite cleared the parent output directory. Its game assertions passed, and a separate rerun with an isolated output directory passed (1/1). All 30 applicable cases are verified. New First Evening resource checks pass on desktop and mobile: buffer/texture counts stay stable through three scene replacements, hidden-tab/reduced-motion pause and resume work, and permanent disposal leaves zero tracked buffers/textures.
- `pnpm e2e`: 16 passed, 2 existing skips. Unrelated screenshots/metrics regenerated by these suites were restored.
- Responsive multitouch checks: 4 passed, 1 desktop skip, covering small-phone, phone, landscape and tablet; localized movement/action/camera controls and pause/resume remain usable.

Raw measurements, script, screenshots and logs: [local evidence](/Users/alenamartinkova/.codex/visualizations/2026/09/14/01a09ec8-068d-72d2-bbdf-aea4aa486f9e/office-plants/).

No commit or deployment was made.

# Shared chair and cart models

14 September 2026. Baseline includes the earlier plant optimization and shared labels. This change only affects Office Escape's chair/cart construction; shared runtime and other games are unchanged.

## Results

Three matched runs per scene/version show **12.3% fewer median draw submissions in Rolling Stock**, which contains seven carts. First Evening, which has one shortcut chair, saves ten draw submissions per sampled frame. This is a smaller optimization than the plant work; rendered FPS remains approximately 60 on the test machine.

| Before → after | First Evening | Rolling Stock |
| --- | ---: | ---: |
| Draw submissions/frame, median | 382 → 372 | 253 → 222 |
| Mean draw submissions/frame | 376.4 → 366.3 | 248.7 → 217.7 |
| Allocated WebGL buffers | 2,111 → 2,071 | 1,590 → 1,299 |
| Buffer storage bytes | 8,204,860 → 8,204,860 | 9,532,912 → 9,256,192 |
| Live WebGL textures | 19 → 19 | 18 → 18 |
| Callback CPU median / p95, ms | 3.4 / 3.9 → 3.2 / 3.7 | 2.2 / 3.0 → 2.1 / 2.8 |
| Loading shell removed, median ms | 491.0 → 469.0 | 378.3 → 375.3 |
| LCP median, ms | 124 → 116 | 112 → 112 |
| Submitted triangles/frame, median | 419,222 → 419,222 | 197,604 → 201,490 |

Rolling Stock retains 18.3% fewer buffer objects but only 2.9% fewer buffer storage bytes; those are different measures. First Evening combines buffers without removing any authored vertices. Idle and paused samples submit zero draws in every run. All twelve navigations finish without application errors. Both initial-view screenshot pairs are pixel-identical at 1280 × 900.

Grouped decoration can submit parts that would previously have been individually culled. Each chair/cart and each instance retains its own bounds; objects are never combined across different physics parents. Rolling Stock's submitted triangle median rises about 2%, including grouping and sampled-view differences. No triangles or visual detail were removed. GPU execution time and physical low-end mobile performance were not measured, so these results do not imply a universal FPS gain.

## Implementation and invariants

- `MovingFurnitureModels.ts` retains the authored primitive construction as a generator in hull-local coordinates. It groups compatible opaque decoration by material and shadow-reception flag: a chair goes from 19 to 9 visible meshes, a cart from 12 to 5. The underlying primitive positions, normals, UVs, materials and rotations are preserved. All current parts have unit scaling; the geometry-equivalence tests include inverse-transpose normal comparison to guard future changes.
- Finished templates are shared with regular Babylon instances, keyed by furniture kind, width, height and depth. Different dimensions retain distinct templates. Sources retain their original moving parent and live until the whole scene is retired. The cache retains at most 64 dimension variants and clears on scene disposal; excess variants still get scene-owned merged visuals without retained cache entries.
- Every object keeps its original full-height, independently pickable collision hull, including furniture above the ground floor. Chairs remain 12 kg, carts 28 kg. Seat/shelf landing height, low center of mass, dragging, tipping, checkpoints and reset are preserved. Only decoration is merged, with no new per-frame copying or synchronization.
- Construction continues to yield between authored parts, merged groups and instances. Existing scene cancellation, material preparation, physics settling, hidden-tab behavior and disposal remain in effect.
- No model downloads, new textures, decoders or offline assets were added. Total observed gameplay JavaScript response grows from 496,647 to 496,958 encoded bytes (+311); the shared Havok response stays at 2,094,563 bytes. Root entry budgets and gameplay transfer remain distinct metrics.

## Measurement conditions and limits

MacBook Pro, Apple M1 Max, 32 GB RAM, Darwin 25.6.0 arm64; installed headless Chrome 152. Root production builds served by local Vite preview, viewport 1280 × 900, DPR 1. Three fresh contexts per route/version, HTTP cache disabled, no network/CPU throttling. Measurements ran without concurrent builds or test suites; browser/driver caches were not purged.

Each run waits for readiness and settling, samples 600 ms idle, presses Play, holds W for 2.2 seconds and pauses for a further 600 ms sample. Draw/triangle/CPU statistics pool submitted callbacks; readiness, LCP and FPS use medians of run values. First Evening covers the previously identified largest opening view/buffer allocation; Rolling Stock covers the largest authored cart population. Existing traversal tests cover all ten levels.

Readiness ranges before → after: First Evening 485.6–507.4 → 463.3–482.1 ms; Rolling Stock 377.8–380.1 → 371.9–377.5 ms. These local startup samples are not field percentiles or evidence of a large loading improvement. LCP measures UI paint, not scene readiness. No startup Long Tasks were observed; Lighthouse TBT was not measured.

Callback timing measures CPU submission, not asynchronous GPU time. Buffer bytes are requested WebGL storage, not total VRAM; texture byte footprints, driver overhead and controlled heap usage were not measured. Browser touch emulation verifies input and layout, not performance on physical mobile hardware.

## Validation

- Root `pnpm build` passed, including `pnpm typecheck`, geometry reproducibility, SEO, entry budgets, route isolation and the shared WASM/font checks. `pnpm lint` and `git diff --check` passed.
- `pnpm test`: 368 passed. Four new tests cover chair/cart transformed geometry, normals, UVs and material/shadow flags; distinct dimensions; culling of visible instances when the source is out of view; independent 12/28 kg Havok bodies; original hull bounds and landing height above the ground floor; tipping, dragging selection, reset and disposal. All ten Office routes still pass actual traversal at 30/60 FPS.
- `pnpm e2e:games`: 30 passed, 2 intentional skips, no retries. First Evening and Rolling Stock keep stable buffer/texture counts over three scene replacements on desktop/mobile, preserve reduced-motion/hidden-tab pause and wake-up, and release all tracked buffers/textures at permanent disposal. The suite also covers every other production game and the catalog.
- `pnpm e2e`: 16 passed, 2 existing skips, no retries. Unrelated screenshots/metrics regenerated by these suites were restored.
- Targeted responsive multitouch checks: 4 passed, 1 desktop skip; small-phone, phone, landscape and tablet retain localized movement/action/camera controls and pause/resume. Root browser suites used separate output directories to avoid trace-file collisions.

Raw measurements, scripts, screenshots and logs: [local evidence](/Users/alenamartinkova/.codex/visualizations/2026/09/14/01a09ec8-068d-72d2-bbdf-aea4aa486f9e/office-furniture/).

No commit or deployment was made.

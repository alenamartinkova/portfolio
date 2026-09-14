# Forklift: shared rack models

14 September 2026. Repeated rack details now share five visual models. In the measured production workloads this reduces draw submissions by 31–36% and allocated WebGL buffer storage by 14–17%. The existing 60 FPS cap, geometry, materials, collision bodies and rack destruction behavior are retained.

## Implementation

`src/world/RackModels.ts` creates each foot plate, foot protector, mounting slot, orange beam and diagonal brace once per warehouse. Subsequent copies use Babylon regular instances. Every copy retains its own transform, parent and visibility bounds. Regular instances are intentional: these details are attached to independently breakable uprights/decks, and individual culling remains useful across the warehouse.

The first visible copy owns the source geometry and remains attached to its original parent. A falling source parent does not move copies attached to other parents. Sources and instances have scene lifetime; the cache clears on scene disposal. Do not dispose a source independently while other rack parts still use it. Warehouse batching already excludes these breakable parent subtrees, so it cannot consume their source geometry.

Physics meshes, masses, damage groups and camera-obstacle membership are unchanged. No fixed world matrices, thin-instance synchronization, additional per-frame loops or downloaded models were introduced. The existing staged warehouse builder still yields between placements and cancels when its scene is disposed. All 14 mission definitions use the same construction path.

This is the first model-sharing experiment, not an offline GLB export. It avoids repeated geometry construction and GPU copies for these details while also reducing active rendering work. Whole-model pre-generation and label atlases remain separate possible follow-ups.

## Matched production measurements

MacBook Pro, Apple M1 Max, 32 GB RAM, Darwin 25.6.0 arm64; installed headless Chrome 152. Viewport 1280 × 900 CSS pixels, DPR 1. Root `pnpm build`, local Vite production preview on port 4288. Three fresh browser contexts per mission per version, browser HTTP cache disabled, no network/CPU throttling. Measurements ran without concurrent builds, unit tests or other browser suites. Browser/driver caches were not purged.

Each run waits for the loading shell to disappear, allows the warehouse to settle, samples 600 ms of idle, holds W for 2.2 seconds, then pauses. `piano-b` is the opening mission with eight racks. `shelf-service` and `night-shift` both have ten racks, the maximum among current missions; they also exercise the delivery shelf and night environment respectively. This samples dense layouts, not every possible camera pose or collision event.

| Metric, before → after | Opening / piano-b | Shelf service | Night shift |
| --- | ---: | ---: | ---: |
| Draw submissions/frame, median | 640 → 440 | 775 → 495 | 799 → 512 |
| Callback CPU median, ms | 4.1 → 3.8 | 4.7 → 4.3 | 4.7 → 4.4 |
| Callback CPU p95, ms | 4.6 → 4.4 | 5.3 → 4.8 | 5.2 → 4.8 |
| Submitted-frame cadence, FPS | 60.0 → 60.0 | 60.0 → 60.0 | 60.0 → 60.0 |
| Live WebGL buffers | 3,986 → 2,539 | 4,574 → 2,759 | 4,598 → 2,783 |
| Allocated WebGL buffer bytes | 8,024,212 → 6,885,780 | 8,549,792 → 7,123,520 | 8,417,664 → 6,991,392 |
| Loading shell removed, median ms | 568.9 → 545.0 | 602.9 → 573.6 | 595.1 → 566.3 |
| LCP median, ms | 48 → 48 | 48 → 48 | 48 → 44 |
| Idle and paused draw submissions | 0 → 0 | 0 → 0 | 0 → 0 |

Draw/CPU medians and p95 use pooled submitted callbacks from the three runs; readiness/LCP/FPS use the median of the three run values. Mean draws in the raw runs are approximately 632 → 435, 773 → 493 and 794 → 508, respectively. Frame cadence counts actual draw-bearing callbacks, not every RAF callback.

Loading-shell ranges were 564.5–577.9 → 531.9–552.1 ms (opening), 597.9–608.3 → 571.5–577.6 ms (shelf), and 593.9–611.8 → 561.1–573.5 ms (night). The small 24–29 ms median startup gains are local samples, not field percentiles. LCP describes page/UI content rather than 3D readiness. Lighthouse TBT was not measured. Startup Long Tasks reported no entries for opening/night in either version; shelf recorded durations of 51/54/51 ms before and none/51/53 ms after. The optimization does not eliminate all possible long tasks.

CPU times include simulation and WebGL command submission, not asynchronous GPU execution. Buffer bytes are the requested storage sizes tracked through WebGL `bufferData` and deletion, including instance matrices. They exclude textures, render targets and driver overhead and must not be described as total VRAM. Sampled JS heap sizes are in the raw data but do not establish a memory reduction. GPU time, power consumption and physical low-end hardware were not measured.

All three initial-view screenshots before/after have identical SHA-256 hashes. Geometry tessellation and resolution were not reduced. Median submitted triangles are unchanged in opening/shelf (224,682 and 240,654); night samples differ slightly (242,690 → 242,540) with frame/culling positions during the timed drive. No application errors occurred in any of the 18 measurement runs.

Observed gameplay JavaScript response bodies increased from 498,575 to 498,730 encoded bytes (+155 bytes). The shared Havok response remains 2,094,563 bytes in this local preview. The isolated static entry gzip budget was 11,224 → 11,223 bytes; it is not total gameplay transfer. No assets or decoders were added, and root route-isolation/bundle checks passed.

## Validation

- Root production build, including type checks, generated-geometry freshness and game-performance budgets: passed.
- `pnpm lint` and `git diff --check`: passed.
- `pnpm test`: 359 tests passed. This includes all 14 staged/synchronous warehouse comparisons, cargo delivery, real rack collision/damage and a new Havok test verifying that shared details follow a collapsing parent while other copies remain independent. The test also covers local bounds, collision/camera ownership and disposal.
- `pnpm e2e:games`: 26 passed, 2 intentional desktop-only skips. The new desktop/mobile resource test repeats the ten-rack scene three times with stable live buffer counts and verifies zero remaining buffers at permanent disposal. It also checks reduced motion, hidden-tab pause and wake-up; existing production tests cover all seven games and the catalog.
- Targeted responsive multitouch suite: 4 passed, 1 desktop skip. Driving, lifting, camera input, pause/resume and localization passed at small-phone, phone, landscape and tablet sizes.
- `pnpm e2e`: 16 passed, 2 existing skips across the per-game suites. No retries were needed. Unrelated screenshots and metrics regenerated by these tests were restored to their original contents.

Raw measurements, the measurement script, screenshots and validation logs are retained in [local evidence](/Users/alenamartinkova/.codex/visualizations/2026/09/14/01a09ec8-068d-72d2-bbdf-aea4aa486f9e/forklift-racks/).

No commit or deployment was made.

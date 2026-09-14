# Crate models and shared labels

14 September 2026. This comparison starts from the working tree **with the earlier Forklift rack optimization already applied**. Forklift now shares crate geometry, details and arrow labels while retaining independent physics bodies. Office Escape reuses identical immutable label materials/textures. No shared runtime or other game's implementation changed.

## Results

In three runs per scenario, Forklift submits a further **33–44% fewer draws** and retains **68–70% fewer live WebGL textures**. The opening/shelf/night scenarios remain at approximately 60 submitted FPS. Office Escape's Rolling Stock level drops from **50 to 18 textures** and from a median **270 to 258 draws/frame**; the other sampled Office routes have essentially unchanged rendering costs.

| Forklift, before → after | Opening / piano-b | Shelf service | Night shift |
| --- | ---: | ---: | ---: |
| Draw submissions/frame, median | 440 → 295 | 495 → 291 | 512 → 286 |
| Live WebGL textures | 81 → 26 | 96 → 29 | 100 → 30 |
| Live allocated WebGL buffers | 2,539 → 1,524 | 2,759 → 1,524 | 2,783 → 1,468 |
| Buffer storage bytes | 6,885,780 → 6,324,100 | 7,123,520 → 6,446,988 | 6,991,392 → 6,269,372 |
| Callback CPU median / p95, ms | 3.8 / 4.4 → 3.4 / 4.2 | 4.2 / 4.7 → 3.6 / 4.2 | 4.3 / 4.8 → 3.7 / 4.1 |
| Loading shell removed, median ms | 569.0 → 463.4 | 586.4 → 540.9 | 586.8 → 515.7 |
| Rendered triangle count, median | 224,682 → 224,682 | 240,654 → 240,654 | 242,540 → 242,540 |
| LCP median, ms | 52 → 52 | 48 → 48 | 48 → 48 |

These are workload-specific results. Mean draws in the raw runs are approximately 435 → 294, 493 → 291 and 508 → 285; table values use medians. No geometry detail or resolution was lowered. Buffer storage falls a further 8–10%; texture **counts** do not measure texture VRAM bytes.

| Office Escape, before → after | First evening | Rolling stock | Night shift |
| --- | ---: | ---: | ---: |
| Draw submissions/frame, median | 576 → 576 | 270 → 258 | 146 → 146 |
| Live WebGL textures | 19 → 19 | 50 → 18 | 19 → 19 |
| Live allocated WebGL buffers | 3,762 → 3,762 | 1,682 → 1,590 | 834 → 834 |
| Buffer storage bytes | 17,079,324 → 17,079,324 | 9,532,912 → 9,532,912 | 4,904,388 → 4,904,388 |
| Callback CPU median / p95, ms | 3.6 / 4.5 → 3.7 / 4.3 | 2.2 / 4.6 → 2.1 / 5.1 | 1.5 / 4.2 → 1.5 / 3.8 |
| Loading shell removed, median ms | 594.4 → 597.9 | 406.3 → 389.1 | 317.4 → 318.6 |
| LCP median, ms | 112 → 112 | 112 → 112 | 116 → 116 |

Office's repeated dispatch arrows now share a material, allowing the existing spatial/material batcher to combine their planes. The labels remain separate by spatial cell. This slightly changes edge-of-view culling: Rolling Stock's sampled median triangles are 200,172 → 200,188. Its CPU p95 did not improve, so this is primarily a demonstrated resource reduction, not a universal CPU gain. Rendered FPS remains approximately 60 for all six scenarios; settled menus/scenes and paused samples submit zero draws in every run. All 36 primary measurement navigations completed without application errors.

## Implementation and ownership

- `forklift/src/world/CrateModels.ts` owns source models for the two authored crate sizes. Each crate retains an independent `Mesh` with the original geometry bounds, a 12 kg Havok body and its existing $85 damage entry. The first body of each size also renders the source geometry. Subsequent collider meshes share that immutable geometry and have their own visible instance child, which follows the collider's physics transform without a new per-frame synchronization loop.
- Seams, flaps, tape and the `↑ ↑` label are instanced and retain their individual bounds and moving parents. The label is shared across both crate sizes because its own dimensions/style are identical. Source geometry/UVs are never baked or edited after publication. Warehouse batching excludes physics/property subtrees, so it cannot merge or dispose the sources. Source meshes must remain alive until the entire warehouse scene is retired.
- Both factories cache **literal** label materials, keyed by text, width, height and colors, up to 128 entries per factory/scene. Every label still gets its own plane and transform. The cache stops retaining new entries at its limit and clears on scene disposal; textures/materials remain scene-owned. Dynamic text callbacks deliberately bypass the cache, preserving independent language changes even when two callbacks initially return the same English text. Resolution, font drawing, sampling and localization are unchanged.
- No model downloads, decoders, offline geometry exports, physics precision changes, global resource caches or new animation loops were introduced. The existing rack implementation and staged/cancellable scene construction remain in place.

## Method and limits

MacBook Pro, Apple M1 Max, 32 GB RAM, Darwin 25.6.0 arm64; installed headless Chrome 152. Root production builds served by local Vite preview. Viewport 1280 × 900 CSS pixels, DPR 1. Three fresh browser contexts per scenario/version, HTTP cache disabled, no CPU/network throttling. The before/after measurements ran without concurrent builds, unit tests or other browser suites. Browser/driver caches were not purged; sequential local lab results are not field percentiles.

The baseline is a saved copy of the root production build after the [rack optimization](forklift/RACK-PERFORMANCE.md). Each primary run waits for loading-shell removal and settling, measures 600 ms of idle, holds W for 2.2 seconds, then pauses. Office starts through the real Play button before movement. Draw/CPU statistics pool submitted callbacks across the three runs; startup/LCP/FPS use the median of run values. Forklift shelf/night both have the current maximum ten racks; the opening mission has eight.

A separate short before/after screen covered **all ten Office levels**, with one fresh-context navigation per level/version and a one-second movement sample. First Evening had the largest allocated buffer storage (17.08 MB) and opening-view draw count in this screen; Archive was next in buffer storage (16.46 MB). Both were covered. The only material/texture-count change across the ten levels was Rolling Stock. The screen checks broad route coverage, not worst-case sustained GPU time across every camera pose.

Loading-shell ranges, before → after: Forklift opening 561.7–575.9 → 453.4–472.5 ms; shelf 583.5–591.9 → 520.5–541.7 ms; night 580.4–587.9 → 446.9–548.2 ms. Office opening 592.2–597.0 → 577.1–603.8 ms; Rolling Stock 405.4–410.5 → 388.3–392.6 ms; night 311.9–331.1 → 317.8–321.2 ms. The wider after night-shift range limits precise startup claims.

LCP measures page/UI paint, not scene readiness. Lighthouse TBT was not measured. Startup Long Tasks were absent in five of the six scenarios in both versions. Forklift shelf reported 52/54/51 ms before and 54/none/54 ms after; the change does not remove every possible startup long task.

CPU timing wraps callbacks that actually submit WebGL draws and excludes asynchronous GPU execution. Buffer bytes count storage requested through `bufferData`, minus deletions. Live texture counts track WebGL texture creation/deletion. Neither is total VRAM; render targets, driver overhead and texture byte footprints were not measured. Raw JS heap snapshots are retained but are not a controlled memory comparison. GPU time, watts and physical low-end devices were not measured.

Observed JavaScript encoded response bodies: Forklift 498,730 → 499,066 bytes (+336); Office 496,167 → 496,276 bytes (+109). Each still downloads the same shared 2,094,563-byte Havok response in local preview. These are gameplay transfers; the root's lightweight entry budget is a different metric. Root route isolation, engine-free catalog and shared-WASM/font checks pass.

The three Office initial-view screenshot pairs are pixel-identical. Forklift pairs differ at only 1/20/7 pixels out of 1,152,000, with maximum color-channel differences of 3/1/1 on the 0–255 scale. Viewed screenshots preserve the same shapes, labels, appearance and layout; they are not claimed byte-identical after instancing.

## Other games reviewed

Brick Break already instances bricks by type/material and caches their geometry. Hexhaven already instances terrain/pieces and uses label atlases. Deploy Friday instances tiles/packets, Cable Management instances cable segments/joints, and Turnaround already instances runway details and moving passenger/baggage groups. Their current model paths do not present the same duplicated-crate-label opportunity. Their implementations were left unchanged; future work should profile their own heaviest interaction rather than assume the Forklift gains transfer directly.

## Validation

- Root `pnpm build` passed, including all game type checks, geometry freshness and production budgets.
- `pnpm test`: 362 passed. Existing Havok warehouse/delivery/rack tests and all ten Office traversal routes remain covered. New tests verify independent moving crate poses/collision bounds and private localized label callbacks, cache styling keys and resource disposal in both factories. The headless label stub now preserves the real label's non-pickable flag.
- `pnpm lint` passed.
- `pnpm e2e:games`: 28 passed, 2 intentional desktop-only skips. Both changed games retain stable buffer **and texture** counts over three scene replacements on desktop/mobile, reach zero tracked resources after permanent disposal, and preserve hidden-tab/reduced-motion pause and wake-up. The suite also covers all seven production games and the catalog.
- `pnpm e2e`: 16 passed, 2 existing skips. No retries were needed; unrelated screenshots/metrics regenerated by these suites were restored.
- Targeted responsive multitouch checks: 4 passed, 1 desktop skip. Both physics games passed simultaneous movement/action/camera input, localized controls and pause/resume on small-phone, phone, landscape and tablet viewports.

Raw measurements, short Office screen, scripts, screenshot comparisons and validation logs: [local evidence](/Users/alenamartinkova/.codex/visualizations/2026/09/14/01a09ec8-068d-72d2-bbdf-aea4aa486f9e/model-sharing/).

No commit or deployment was made.

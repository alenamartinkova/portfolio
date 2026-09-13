# Turnaround early access · initial validation baseline

These initial-release measurements are preserved as a baseline. The subsequent [performance and battery follow-up](POWER-REPORT.md) documents the optimized version, comparable before/after workloads and the latest checks.

Measured on 13 September 2026 from the root production build. Turnaround is a new workspace; there is no previous version for a before/after comparison. Existing game implementations and shared renderer/physics helpers were not changed.

## Environment and method

Apple M1 Max, 32 GiB RAM, macOS/Darwin 25.6.0 arm64; headless Chrome 152.0.0.0 using the installed Chrome channel. Desktop viewport: 1280 × 900, DPR 1. Touch viewport: 380 × 820, DPR 1. Each test opens a fresh browser context against local Vite preview, with no explicit CPU or network throttling. These are local host measurements, not low-end device certification.

The production suite instruments WebGL draw submissions and measures only RAF callbacks that actually submit draws. CPU time includes simulation and WebGL submission; it excludes asynchronous GPU completion. Resource sizes are the browser's `encodedBodySize` totals, excluding HTTP headers, CSS and fonts. Raw samples and build totals are in [docs/measurements.json](docs/measurements.json).

LCP is observed through `PerformanceObserver`; it can describe the loader or menu, not readiness of the 3D scene. Lighthouse TBT was **not measured**. The separate long-task column sums time above 50 ms for all observed long tasks during each test, including interactions; it is not a Lighthouse TBT score.

## Loading

| Turnaround payload                                                       |     Bytes | Gzip bytes |
| ------------------------------------------------------------------------ | --------: | ---------: |
| Static entry graph, 4 JavaScript files                                   |     7,786 |      4,038 |
| All reachable JavaScript, including optional dynamic branches, 125 files | 1,851,224 |    475,947 |
| Shared Havok WASM, one build asset                                       | 2,094,563 |    661,689 |

Gzip values use Node `gzipSync` per emitted file. The complete reachable graph is an upper bound, including optional Babylon shader/backend branches. The observed selected-route session fetched **398,308 bytes of encoded JavaScript response bodies plus 2,094,563 bytes of WASM**. The 4 kB entry does not represent total gameplay transfer.

The root build checks passed: engine-free catalog and Brick Break collection, route isolation, entry budgets, canonical fonts, no React in Turnaround's dynamic graph, and one shared WASM URL. Geometry and vehicles are procedural; there are no downloaded models, textures or audio assets. Touch-only devices select the desktop notice before importing the engine and allocate zero WebGL contexts.

## Production rendering

The Turnaround scenario loads the menu, starts flight 1 on final approach, runs briefly, pauses, and replaces the scene twice. It recorded 232 callbacks containing draws. Mean callback CPU time was **1.46 ms**, maximum **8.40 ms**; mean draw calls per sampled frame were **292.8**. Contiguous rendered-frame intervals averaged **16.67 ms**, approximately **60.0 rendered FPS**. Idle gaps of 100 ms or more are excluded from that cadence; it is not an average over the entire paused test.

| Production route | LCP ms | Long-task excess ms | Encoded JS bytes | Mean draws / sampled frame | Mean callback CPU ms |
| ---------------- | -----: | ------------------: | ---------------: | -------------------------: | -------------------: |
| Office Escape    |    132 |                   0 |          496,183 |                      720.1 |                 3.73 |
| Forklift         |     48 |                   0 |          498,584 |                      646.6 |                 3.91 |
| Brick Break      |    144 |                   8 |          234,363 |                       10.0 |                 0.26 |
| Hexhaven         |     76 |                  71 |          186,135 |                       35.0 |                 4.61 |
| Deploy Friday    |    228 |                  25 |          160,575 |                       12.0 |                 0.55 |
| Cable Management |    188 |                  19 |          143,302 |                       59.0 |                 0.64 |
| Turnaround       |    364 |                   0 |          398,308 |                      292.8 |                 1.46 |

These are different short regression scenarios, not comparable gameplay workloads. Settled puzzle views produce very few samples; their averages are sensitive to a single update. Office Escape and Forklift also load the same 2,094,563-byte WASM response. The JSON includes touch runs for the six existing games. The catalog was checked without JavaScript and with stored Slovak/light preferences; static build inspection confirms it imports no renderer.

Separate keyboard browser tests exercised both actual ramps. Flight 2, the heavier available configuration, included wet surfaces, the full vehicle fleet, passengers, moving baggage and simultaneous refuelling/unloading. Its actual-submission FPS meter showed 60 FPS in [the captured frame](docs/flight-2-service.png). This is a visual spot check, not a sustained service-phase CPU/GPU benchmark. [Flight 1](docs/flight-1-service.png) and [the menu](docs/menu.png) were also inspected.

## Lifecycle, input and quality checks

- Initial menus, paused flights and settled ramp scenes stop drawing. Paused and simulated-hidden-tab clocks remain unchanged. Resuming wakes rendering; idle service time continues through a separate low-frequency clock.
- Two repeated production scene replacements leave exactly one live WebGL context. Permanent page exit during delayed WASM loading cancels construction without rendering a late scene.
- Tests cover desktop controls, the touch-only notice, reduced motion, English/Slovak, and pause/resume. Light and dark screenshots were inspected.
- The shared 1.5-million-pixel / 1.25-DPR cap, 60 FPS limit, low-power context preference, no shadows and one 2× MSAA or FXAA path are retained. Static geometry is merged by material and spatial cell; passengers and conveyor bags use thin instances.
- GPU timings, GPU memory and a heap-allocation profile were not collected. Context counts guard renderer replacement but do not prove the absence of every allocation leak. Full-shift balancing and sustained performance on slower machines remain early-access follow-up work.

## Final checks

| Command          | Result                                                         |
| ---------------- | -------------------------------------------------------------- |
| `pnpm typecheck` | Passed as part of the root build                               |
| `pnpm test`      | 349 passed, including 20 Turnaround tests                      |
| `pnpm lint`      | Passed                                                         |
| `pnpm build`     | Passed, including geometry, SEO and game performance checks    |
| `pnpm e2e:games` | 24 passed, 2 intentional desktop-only skips                    |
| `pnpm e2e`       | 11 passed, 2 existing skips; both Turnaround ramp tests passed |

Turnaround's 20 unit/integration tests cover the complete task graphs for both flights, safe ordering, parallel and interrupted services, docking, records/serialization, flight transitions, both taxi routes and seven real Havok driving/collision tests. Browser coverage drives the opening ramp services rather than completing every service trip. The gameplay scope and deliberate arcade simplifications are documented in [README.md](README.md).

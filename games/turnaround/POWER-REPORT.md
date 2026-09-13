# Turnaround · performance and battery follow-up

The stationary refuelling workload now submits no 3D frames, while service time and the checklist continue. Flying and moving passengers/baggage retain approximately 60 rendered FPS. The main improvements are fewer draw submissions on approach, independent sleeping of vehicle physics, and no game polling or running audio context during a pause or hidden tab.

## Comparable workload measurements

Measured on 13 September 2026: Apple M1 Max, 32 GiB, Darwin 25.6.0 arm64, headless Chrome 152, 1280 × 900 at DPR 1. Fresh browser contexts, local Vite development server, no explicit network/CPU throttling. Both versions use the same real keyboard route and docking actions on flight 2's wet ramp. Load/build/unit-test jobs were kept separate from these captures. The active workload samples are five seconds; idle samples are three seconds.

| Scenario                              | Rendered FPS before → after | Draws/frame before → after | Callback CPU ms per second before → after |
| ------------------------------------- | --------------------------: | -------------------------: | ----------------------------------------: |
| Flight 1 approach                     |               59.93 → 59.93 |            287.68 → 110.00 |                             79.03 → 61.19 |
| Flight 2, stationary refuelling       |                   60.11 → 0 |                    129 → 0 |                              58.49 → 0.70 |
| Flight 2, passengers/baggage/services |               60.07 → 59.92 |                  133 → 133 |                             64.16 → 51.41 |
| Settled ramp before work              |                       0 → 0 |                      0 → 0 |                               0.47 → 0.53 |
| Services finished                     |                       0 → 0 |                      0 → 0 |                               0.53 → 0.50 |

The approach uses **62% fewer draw submissions** and about **23% less measured callback CPU time**. Stationary refuelling reduces measured callback CPU time by approximately **99%** and removes continuous WebGL rendering entirely. Parallel services use about **20% less callback CPU time** while keeping their visual animation. The small sub-millisecond differences in already-idle scenes are measurement noise, not useful evidence of an energy change.

DOM mutations during the five-second refuelling sample fell from **719 to 21**; parallel services fell from **763 to 79**. Clock updates and service progress remain visible. Menus previously woke the game timer about once a second; menus, pauses and a simulated hidden tab now record **zero RAF callbacks and zero timer callbacks** after the FPS meter's final cleanup sample. The playing but stationary ramp retains approximately one timer wake per second, with an earlier wake if a service is due to finish.

Raw results: [before flight](docs/power/before-flight.json), [after flight](docs/power/after-flight.json), [before wet ramp](docs/power/before-ramp.json), [after wet ramp](docs/power/after-ramp.json). The [before](docs/power/before-services.png) and [after](docs/power/after-services.png) service screenshots were inspected. Small vehicle-position and checklist-time differences follow the real-time keyboard automation; these are equivalent workloads, not deterministic pixel captures.

## What changed

- Runway lights and centerline marks share instanced geometry and draw submissions. Each instance keeps its frustum test, and the source geometry is excluded from static merging. Geometry, view distance, resolution and antialiasing are retained.
- Vehicle physics sleeps only after every enabled body has settled for 0.4 seconds. Rest includes full linear velocity and angular velocity, preventing sideways motion, falling or turning from being mistaken for rest. Controls wake the same fixed 120 Hz simulation; active collision behavior and wet braking are unchanged.
- Service time advances independently of physics/rendering. Fixed task ticks preserve dependencies and ghost completion timestamps even when grouped into a timer wake. The next completion deadline can wake earlier than the normal one-second UI cadence, so this does not impose a one-second waiting penalty on the player.
- Only progressing passenger/baggage visuals keep the ramp rendering. Fuel, water, catering and other invisible timers do not. An interrupted service whose vehicle has left its dock cannot keep drawing an unchanged conveyor indefinitely.
- HUD attributes are written only when changed. Menu/pause/result states cancel the mission timer rather than leaving a polling callback active.
- AudioContext resume/suspend operations are serialized. The new browser test exposed a real race in which a pending resume could leave the APU sound running after the tab was hidden; the fix is verified with sound enabled during a rapid resume/hide sequence.

## What these numbers say about battery use

These measurements quantify avoidable game work, **not watts, watt-hours or battery percentage per hour**. Callback CPU includes the instrumented RAF/timer handlers and their WebGL submission work; it excludes asynchronous GPU execution, compositor/layout work, unwrapped callbacks and other applications. Draw counts are command counts, not a measurement of GPU energy. Flight/ramp workload samples use muted sound; the separate hidden-tab check enables audio and verifies its suspended state.

The main battery benefit should come during stationary services and while paused: repeated 3D submissions and physics work are removed rather than just running at a lower FPS. While actively flying or driving, the display and GPU still render a 3D scene at 60 FPS. Predicting additional hours of battery life would require an isolated, repeatable on-battery power measurement with fixed display brightness and other workloads controlled. No such power measurement was taken, and no battery-life percentage is claimed.

GPU timing and GPU/heap memory profiles were not collected. The existing production context-lifetime regression remains the guard for scene replacement. This follow-up changes Turnaround only; shared implementations and the six existing game implementations remain unchanged.

## Reproduce and validate

```sh
pnpm --filter turnaround exec playwright test --config playwright.power.config.ts
pnpm build
pnpm lint
pnpm test
pnpm e2e:games
pnpm e2e
```

The dedicated workload regression checks idle refuelling, live-clock advancement, prompt completion of the three-second chock/GPU task, real vehicle driving after sleep, parallel animation, paused clocks, completed services, zero hidden-tab callbacks and suspended audio. Additional unit/integration tests cover full-body settlement and identical ghost timestamps under coalesced service updates. The production build keeps the approximately 4 kB gzip entry separate from total gameplay transfer; [bundle totals](docs/power/bundles.json) include the complete dynamic graph and shared Havok WASM.

The final [production smoke capture](docs/power/production.json) recorded 110 draws per sampled frame, 1.17 ms mean / 5.10 ms maximum callback CPU time, and approximately 60 contiguous rendered FPS. Observed LCP was 360 ms and long-task excess was 0 ms; the latter is not Lighthouse TBT, which was not measured. Selected-route JavaScript response bodies totalled 399,010 encoded bytes plus 2,094,563 bytes of WASM. The complete reachable JavaScript upper bound is 1,853,747 raw bytes / 476,649 gzip bytes; the initial entry alone is 7,786 raw / 4,037 gzip bytes. This short production scenario includes startup, approach, pause and repeated scene replacement; it is separate from the comparable wet-ramp development measurements above.

| Final check                    | Result                                                                 |
| ------------------------------ | ---------------------------------------------------------------------- |
| `pnpm build`                   | Passed, including typecheck, geometry, SEO and game-performance checks |
| `pnpm lint`                    | Passed                                                                 |
| `pnpm test`                    | 351 passed, including 22 Turnaround tests                              |
| Dedicated power workload suite | 2 passed                                                               |
| `pnpm e2e:games`               | 24 passed, 2 intentional desktop-only skips                            |
| Per-game browser suites        | 11 distinct scenarios passed, 2 existing skips, with the retry below   |

The aggregate `pnpm e2e` run initially stopped on the pre-existing intermittent Hexhaven seed-input failure (`12026` instead of `1`). The isolated desktop localization test passed on retry without code changes. The remaining Brick Break and Turnaround suites were then run explicitly and passed, including both real ramp-driving scenarios. No Hexhaven or Brick Break implementation/test changes were made for this follow-up.

## Platform appearance follow-up

The interface now uses the platform's shared typography, color tokens, navigation and appearance controls. The game header and modal backdrop have no backdrop blur. Menu, pause and result dialogs move one mounted appearance group between the header and dialog instead of creating additional observers/listeners. The touch notice uses the same controls while remaining renderer-free. Game physics, draw-distance and resolution settings are unchanged.

The workload suite was rerun after the appearance changes, on the same host/browser/viewport and without concurrent build or test jobs. These are new regression samples; the earlier before/after captures remain intact. Raw data: [flight](docs/power/appearance-flight.json), [wet ramp](docs/power/appearance-ramp.json).

| Scenario | Rendered FPS | Draws/frame | Callback CPU ms/second |
| --- | ---: | ---: | ---: |
| Approach | 59.92 | 110 | 68.29 |
| Stationary refuelling | 0 | 0 | 0.66 |
| Parallel services | 60.10 | 133 | 56.12 |
| Menu, pause, hidden tab | 0 | 0 | 0 |

Menu, pause and hidden-tab samples also recorded zero RAF callbacks and zero timer callbacks; enabled audio suspended correctly. Refuelling kept the mission clock advancing with five timer callbacks in five seconds and no rendered frames. The changed interface retains the rendering/sleep limits. Callback CPU variation is not a power measurement, and this follow-up makes no additional battery-life percentage claim.

The final [bundle capture](docs/appearance/bundles.json) records a 7,788-byte raw / 4,043-byte gzip initial JavaScript entry. The complete reachable JavaScript upper bound is 1,854,733 raw / 477,041 gzip bytes, plus shared Havok WASM at 2,094,563 raw / 661,689 gzip bytes. Canonical font URLs remain shared with the platform.

Validation passed: production build (including typecheck and performance budgets), lint, 351 unit/integration tests, 24 production browser checks with 2 intentional skips, all 13 per-game browser scenarios with 2 existing skips, and both power-workload tests. The new browser scenarios cover theme/accent/locale persistence, live control relocation, Escape in the palette, and the renderer-free touch notice. Both real keyboard ramp-driving tests passed, including reduced motion on flight 2. No retry of another game's test was needed in this run.

Reviewed captures: [dark menu](docs/appearance/menu-dark.png), [light menu](docs/appearance/menu-light.png), [dark ramp](docs/appearance/ramp-dark.png), [wet-ramp services](docs/appearance/flight-2-service.png), [Slovak touch notice](docs/appearance/touch-light-sk.png).

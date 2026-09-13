# Handling and ground equipment regression — 2026-09-13

A/D originally turned the vehicle in the opposite visible direction: the steering sign did not account for Babylon's left-handed camera. Vehicle steering now follows the cab, walking uses the fixed camera's screen directions, and aircraft inputs use the corresponding camera conversion. Regression tests project movement through the actual camera and exercise keyboard input in the browser.

Ground equipment now has compound colliders covering cabs, tanks and raised working parts. The parked aircraft includes its wings, engines, propellers, tail and landing gear and remains solid while positioning the push-back tractor. Stair height changes keep the bottom at apron level; the landing, handrails and conveyor face their service doors. Passenger and bag paths follow the equipment pose. Two baggage carts have physical hinge joints, wheel resistance, collision bodies and four-wheel models. All carts must settle before the scene sleeps.

Taxi and connected aircraft push-back remain arcade kinematics. Passengers and individual conveyor bags remain kinematic instances. This regression validates the listed ground-equipment cases, rather than all possible collision configurations.

## Validation

- `pnpm lint`: passed.
- `pnpm test`: 356 passed, including 27 Turnaround operations/physics tests.
- `pnpm build`: passed, including type checks, route isolation and game performance budgets.
- `pnpm e2e:games`: 24 passed, 2 intentional mobile skips.
- `pnpm e2e`: 15 passed, 2 existing skips; all 6 Turnaround browser tests passed without retries.
- Dedicated power regression: 2 passed, including wet-ramp driving, refuelling, parallel services and pause/hidden-tab suspension.

Physics checks cover steering as seen by the camera, walking, wet braking, actual aircraft docking clearances, raised equipment contacting an overhead obstacle, trailer joints through turns and reversing, trailer collision with a wall, and whole-scene settlement. Browser checks include A/D on foot and in the tractor, manual approach arrows and the initial service sequence of both flights. They do not constitute a complete human playtest of every service trip.

Screenshots: [turning baggage train](docs/handling/baggage-train-turn.png), [manual right bank](docs/handling/manual-right-bank.png), [flight 1 service](docs/handling/flight-1-service.png), [flight 2 service](docs/handling/flight-2-service.png).

## Workload and battery-related behavior

Measured on Apple M1 Max, 32 GiB RAM, Darwin 25.6.0, headless Chrome 152, 1280 × 900 at DPR 1. Local Vite build, fresh browser contexts, no CPU/network throttling and no concurrent build or test suite during these samples. Active samples last 5 seconds; idle samples last 3 seconds. These are workload measurements, not measured watts or battery-life estimates. Callback CPU excludes layout, asynchronous browser/GPU work and unwrapped callbacks. Single-run differences should not be treated as statistically established speedups.

| Scenario | Rendered FPS | Draws/frame | Callback CPU ms/s |
| --- | ---: | ---: | ---: |
| Menu | 0 | 0 | 0 |
| Approach | 60.1 | 112 | 64.75 |
| Settled ramp | 0 | 0 | 0.57 |
| Refuelling alone | 0 | 0 | 0.36 |
| Parallel visible services | 60.1 | 133 | 57.00 |
| Services finished | 0 | 0 | 0.27 |
| Paused / hidden / paused services | 0 | 0 | 0 |

Menu, pause and hidden samples recorded zero animation-frame and timer callbacks. Settled and refuelling scenes rendered no frames while their low-frequency mission clock continued. Compared with the preceding appearance capture, approach draws increased from 110 to 112; parallel services remained at 133 draws/frame and approximately 60 FPS. Callback CPU was 68.29 → 64.75 ms/s on approach and 56.12 → 57.00 ms/s for parallel services. The new geometry and colliders preserve the measured idle behavior.

Raw samples: [flight/menu/background](docs/power/handling-flight.json), [wet ramp/services](docs/power/handling-ramp.json). Historical appearance and earlier power samples are retained alongside them.

## Production bundle

| Scope | Files | Raw bytes | Gzip bytes |
| --- | ---: | ---: | ---: |
| Initial static JavaScript graph | 4 | 7,788 | 4,040 |
| All reachable JavaScript, including dynamic imports (upper bound) | 125 | 1,861,322 | 478,825 |
| Shared Havok WASM | 1 | 2,094,563 | 661,689 |

The initial menu remains renderer-free. Totals use the production game bundle graph, count each reachable file once and gzip each file independently; the full dynamic graph is an upper bound, not the initial transfer. Machine-readable totals: [bundles.json](docs/handling/bundles.json).

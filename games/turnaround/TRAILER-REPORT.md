# Baggage train correction — 2026-09-13

The previous carts resisted rotation because their inertia was mass-scaled even though Havok expects inertia per unit mass. The compound shapes also left a tilted principal frame while the hitch allowed only vertical rotation. Tire resistance acted at the body center and the visible front wheels could not steer. Together these produced sideways sliding instead of a train following its tractor.

Each cart now has a 370 kg deck/rear axle and an 80 kg steering axle/drawbar, with matching visible front wheels. Their inertia is expressed per unit mass in an upright frame. Two limited vertical hinges connect the drawbar to the preceding vehicle and the front axle to its deck. Rear-tire resistance uses contact-point velocity, including angular velocity, with bounded wet/dry grip. No trailer poses are teleported or projected onto a recorded tractor path.

The tractor steers progressively, uses a nominal minimum 5 m turning radius, reduces speed in bends and targets at most 1.8 m/s in reverse. The steering axles have 60° mechanical stops. Bodies collide with other equipment; only each axle's intentionally overlapping contact with its own deck is disabled. Front axles are included in aircraft damage attribution and whole-scene settlement. Their separate mesh batches and physics bodies are disposed with the carts. Step calculations reuse vectors and do not create new meshes or shapes.

## Driving regression

The same 120 Hz Havok test drives forward for 3 s, steers fully right for 2 s, fully left for 2 s, then drives straight for 5 s. It brakes, reverses straight for 3 s, and brakes again. Both dry and wet runs test hitch separation, axle sideslip, steering limits, speed and alignment, then require the complete train to settle. A separate tire-impulse test guards both unit-mass inertia and the upright principal frame. Existing wall-contact and reverse-joint tests remain enabled.

| Metric | Dry | Wet |
| --- | ---: | ---: |
| Maximum rear-axle sideways speed | 0.89 m/s | 1.05 m/s |
| Maximum front-axle steering | 47.6° | 49.6° |
| Maximum hitch separation | 2.3 mm | 1.6 mm |
| Maximum cart speed | 4.46 m/s | 4.46 m/s |
| Largest heading error after the straight | 0.020° | 0.032° |
| Tractor speed after 3 s reversing | 1.07 m/s | 1.07 m/s |
| All decks and axles settled after braking | Yes | Yes |

These are results for the authored maneuver, not guarantees for every collision or arbitrary input sequence. Reverse remains articulated and can fold the train up to its joint/contact limits; pulling forward straightens it. This is an arcade chassis with tire impulses, without suspension or individually simulated suitcase loads.

Raw results: [physics.json](docs/trailers/physics.json). Reproduce with `TRAILER_REPORT=1 pnpm --filter turnaround test`.

Browser captures: [right bend](docs/trailers/train-right-turn.png), [reverse](docs/trailers/train-reversing.png), [straightened and settled](docs/trailers/train-stopped.png).

## Validation and performance

- `pnpm lint`: passed.
- `pnpm test`: 358 passed, including 29 Turnaround tests.
- `pnpm build`: passed, including type checks, game entry budgets, route isolation and shared WASM checks.
- `pnpm e2e:games`: 24 passed, 2 intentional mobile skips.
- `pnpm e2e`: 16 passed, 2 existing skips; all 7 Turnaround browser checks passed without retries.
- Dedicated power workload: 2 passed. Normal/reduced motion, desktop/touch notice, pause/resume, hidden tabs and scene replacement remain covered by these suites.

The production capture used Apple M1 Max / 32 GiB / Darwin 25.6.0 and headless Chrome 152, 1280 × 900 at DPR 1. A fresh browser context loaded the local root Vite production preview without CPU or network throttling. The capture recorded LCP 364 ms, long-task blocking 0 ms, 114 mean draws/frame and a 16.7 ms median active frame interval (about 60 FPS). Mean measured render-callback CPU was 1.24 ms, maximum 5.80 ms. These callback samples exclude GPU execution and are not measurements of watts or battery life. Memory growth was not quantified in this capture; lifecycle/replacement checks cover cleanup behavior.

Observed resource timing recorded 401,778 encoded JavaScript bytes and 2,094,563 WASM bytes for that scenario. The complete reachable dynamic graph below includes code paths that the scenario did not necessarily request. Raw production observations: [production.json](docs/trailers/production.json).

| Production graph | Files | Raw bytes | Gzip bytes |
| --- | ---: | ---: | ---: |
| Initial static JavaScript | 4 | 7,788 | 4,039 |
| All reachable JavaScript, including dynamic imports | 125 | 1,864,821 | 479,645 |
| Shared Havok WASM | 1 | 2,094,563 | 661,689 |

Each file is counted once and gzipped independently. Compared with the preceding handling build, the complete JavaScript upper bound grew by 3,499 raw / 820 gzip bytes; no new runtime package or WASM download was introduced. [Bundle totals](docs/trailers/bundles.json).

## Power-workload comparison

The dedicated workload ran after the other suites, with no concurrent build/test work, on the same hardware/browser/viewport described above. It uses fresh contexts and the local development server, with no throttling. Active samples last 5 s; idle samples last 3 s. This is a single-run comparison with the preceding handling capture; callback timing can vary and excludes asynchronous browser/GPU work.

| Scenario | Current rendered FPS | Draws/frame before → after | Callback CPU ms/s before → after |
| --- | ---: | ---: | ---: |
| Approach | 60.1 | 112 → 114 | 64.75 → 76.83 |
| Parallel visible services | 59.9 | 133 → 135 | 57.00 → 63.22 |
| Settled ramp | 0 | 0 → 0 | 0.57 → 0.83 |
| Refuelling alone | 0 | 0 → 0 | 0.36 → 0.90 |
| Services finished | 0 | 0 → 0 | 0.27 → 0.66 |
| Menu / pause / hidden / paused services | 0 | 0 → 0 | 0 → 0 |

The two independently rotating axle batches add two draw calls to these active scenes. Measured active callback CPU increased; the capture still maintained approximately 60 FPS. Menu, pause and hidden states recorded no animation-frame or timer callbacks. Settled and refuelling scenes rendered no frames and retained only their low-frequency mission/service clock. The additional axle bodies therefore preserve whole-scene sleep; these measurements do not establish unchanged battery consumption while driving.

Raw current samples: [flight](docs/power/trailers-flight.json), [ramp](docs/power/trailers-ramp.json). Baseline: [handling flight](docs/power/handling-flight.json), [handling ramp](docs/power/handling-ramp.json).

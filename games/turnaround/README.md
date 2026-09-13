# Turnaround · early access

**07 / 3D physics · airport ops — wheels down. clock's running.**

A local, desktop browser game with two playable flights, one generic turboprop, one runway and three marked stands. Gate 2 is active in this release. No accounts, backend, licensed airlines or downloaded models.

## Play

```sh
pnpm install --frozen-lockfile
pnpm --filter turnaround dev
# http://127.0.0.1:4182/turnaround/
pnpm dev
# http://localhost:3000/turnaround/
```

Choose a flight and optional automatic landing/takeoff. Land, brake, follow the yellow taxiway to Gate 2 and stop at the mark facing the terminal. Walk to the violet ring to secure the aircraft, then switch service vehicles. Every dock shows distance, heading and platform height. Stop inside the ring with the correct alignment before pressing **F**.

Connected stairs, belt, fuel, catering and water services continue while another vehicle is selected. Bags require a tug trip to the terminal and back. Boarding waits for the relevant services. Start the APU before removing ground power, remove chocks last, visit four inspection points, disconnect equipment and return vehicles to their parking bays. Bring the push-back tug to the aircraft's nose, connect, hold **S** to push beyond 24 m, brake and disconnect. Taxi back to runway 27 and take off.

| Flight                          | Weather                            | Services                                                                                              |
| ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 01 · The first rotation         | Clear afternoon                    | Secure aircraft, passenger stairs, baggage out/in, boarding, APU/disconnection, inspection, departure |
| 02 · A little rain, a lot to do | Wet apron, longer braking distance | Flight 1 plus fuel, catering, water and waste; safe boarding dependencies                             |

Flight 1 has 17 checklist steps across five service categories; Flight 2 has 20 steps. Durations and dependencies live in `src/core/tasks.json`. The UI marks later flights and free ramp as **coming later**; these are not selectable placeholders.

## Controls

| Mode                 | Controls                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Aircraft on approach | W/S throttle, left/right arrows bank, up arrow descend, down arrow flare                                                |
| Rollout              | Space brake, R reverse thrust                                                                                           |
| Taxi                 | W/S forward/reverse, A/D steering, Space brake; stop facing north on the gate/runway mark                               |
| On foot              | WASD walks relative to the fixed camera: A left, D right, W up, S down; F interact                                    |
| Ramp vehicles        | W/S forward/reverse, A/D steer relative to the cab, Q/E platform height, Space brake, F interact/disconnect          |
| Selection            | Click a vehicle or a checklist item; 1–8 quick selection; Tab/Shift+Tab cycles vehicles while the canvas is focused     |
| Push-back            | F connect, S push backward, A/D reversed aircraft steering, Space brake, F release beyond 24 m                          |
| Takeoff              | W full throttle, left/right arrows centerline, down arrow rotate at the displayed VR; Space can brake before commitment |
| UI                   | C checklist, Escape pause/resume; dialog links provide keyboard access back to the collection                           |

Loss of window focus or page visibility pauses physics, timers and audio. Resumption is explicit. Audio transitions are serialized so a delayed resume cannot restart sound after hiding the tab. Sound starts muted and uses synthesized APU hum and interaction/reversing beeps. The interface supports English/Slovak, light/dark appearance, shared website preferences and reduced motion. Touch-only devices show a keyboard requirement before downloading Babylon or Havok.

The interface uses the portfolio's shared color tokens, Inter / Space Grotesk / JetBrains Mono typography, panel radii and `am.` navigation. Theme, all six accent colors and language controls are available in the flight menu, during play, in pause/results and on the touch notice. Desktop dialogs reuse the same mounted control group, preserving its listeners without duplicate picker IDs. Accents update menus, selection, progress and map markers; aircraft and ground equipment retain the fictional violet airline livery. Navigation and modal backdrops use solid fills without backdrop blur or continuous decorative animation.

## Scores and persistence

The score is elapsed unpaused time plus penalties. The four stars are no aircraft damage, no safety violations, correct baggage, and a soft manual landing with manual takeoff. The first two flights have no foreign bags; baggage sorting belongs to a later flight. Auto-land/auto-takeoff affect only the flying star. Fastest records and checklist completion times are stored separately for each flight and assist combination under `turnaround:records:v1`. Completed tasks show their difference from the previous fastest checklist. Failed/blocked storage falls back to the current session.

Only completed flights save records. The serializable operations state is independent of rendering; physical vehicle positions are not saved across reloads. There is no global leaderboard or full movement replay.

## Implementation and deliberate prototype limits

- Babylon.js + Havok use the same impulse-chassis approach as Forklift. The small physics helpers belong to this workspace; no game imports another game's implementation. Service vehicles use fixed 120 Hz impulse driving, distinct masses/turning radii and wet traction. These are stable arcade chassis, not raycast suspension vehicles. Compound colliders cover chassis, cabs, tanks, lifted stairs/platforms and the conveyor. The parked aircraft includes fuselage, wings, engines, propellers, tail and landing gear; these remain solid while positioning the push-back tug.
- The custom aircraft model uses speed, thrust, drag, pitch, bank, lift loss at low speed, ground steering, touchdown evaluation and go-arounds. Taxi and push-back are deterministic arcade kinematics. Rollout transfers to the taxi exit after stopping; a missed exit adds time. This release does not simulate crosswind/crab or real aviation procedures.
- Each of the two baggage carts has a passive deck/rear axle and a separate physical steering axle connected to its drawbar. Limited vertical hinges let the front wheels follow the drawbar while the rear wheels follow the deck. Tire forces use velocity at each axle, including rotation; Havok inertia uses per-unit-mass values in an upright principal frame. The tractor steers progressively with a nominal 5 m minimum radius, reduces speed in bends and targets at most 1.8 m/s in reverse. Bodies retain external collisions; only a steering axle's contact with its own overlapping deck is excluded. Both decks and steering axles participate in whole-scene settlement before rendering sleeps. The tug carries one outbound batch and one returning batch, without individual suitcase selection. Passengers and conveyor bags remain kinematic thin instances; their paths follow the actual stairs and belt pose/height.
- The staircase changes its rise while its bottom remains at the apron; its landing meets the passenger doorway. The belt rises toward the cargo hold. These purpose-built models have no passenger-truck cab obstructing their working surface. Q/E updates their reused compound shape only when height changes.
- GPU/chocks are a combined initial action. Fuel automatically stops at its target after the service duration. Water/waste use the same docked service pattern. A full hose/cable simulation, fuel overfill, ambulift, rear passenger door and jet aircraft are deferred.
- Wet patches and altered light/fog communicate flight 2's weather. No real-time rain particles, planar reflections, night flight or recorded radio voice in this release. There are no live shadow passes.
- Both flights use Gate 2; other stands establish the airport layout. Flights 3–6, two-aircraft operations, daily seed and free ramp remain future work.

## Ramp layout

Coordinates are meters in the local apron frame. North is −Z, with the nose toward the terminal. The parked aircraft center is `(0, 0)`, nose near `(0, -9)`, wing span about 22 m. The paved apron is 106 × 93 m; the terminal is 93 × 14 m, centered at `(0, -34)`. Gates are at X = −31, 0 and 31. The runway centerline is X = −64; the taxi line crosses Z = 40. The baggage transfer bay is `(−24, −18)`.

The JSON task file contains exact docking coordinates, headings, height tolerances and durations. `VEHICLES` in `src/core/operations.ts` contains the eight depot locations and handling parameters. This forms the starting layout for adding further flights.

## Verification and performance

```sh
pnpm --filter turnaround typecheck
pnpm --filter turnaround test
pnpm --filter turnaround e2e
pnpm lint
pnpm test
pnpm build
pnpm check:game-performance
pnpm e2e:games
pnpm e2e
```

Release output is produced only by the root multi-page build. The selected renderer is loaded through the shared abortable loader, construction and material preparation yield cooperatively, and the shared render loop/FPS meter count actual submissions. Resolution is capped at 1.5 million pixels / 1.25 DPR, with one 2× MSAA or FXAA path. Static decoration is merged by material/spatial cell; repeated passengers/bags use instance buffers. Menus, paused screens and settled ramp scenes stop drawing; a separate low-frequency clock keeps idle mission time correct.

Runway lights and centerline marks use regular instances with per-object frustum culling. All physical vehicle bodies must settle, including lateral/vertical motion and yaw, before the entire Havok scene sleeps. Controls wake the unchanged 120 Hz simulation immediately. Passenger and baggage animations continue at 60 FPS while stationary vehicles sleep. Invisible services such as fuel need no continuous rendering: a timer updates the clock/checklist at most once per second, with an earlier wake for an exact service completion. Menus, pauses and hidden tabs stop that timer as well. HUD attributes are written only when their values change.

For the dedicated battery-workload regression and before/after measurements, run `pnpm --filter turnaround exec playwright test --config playwright.power.config.ts`. The test uses real keyboard docking on the wet ramp, checks service completion latency, and tests audio suspension during rapid resume/hide. See [POWER-REPORT.md](POWER-REPORT.md) for CPU callback time, rendered frames, draw calls, wakeups and the limits of inferring battery use from these measurements.

The tests cover both complete dependency graphs, interrupted/parallel services, docking tolerances, safety rules, serialization, assist-specific records and corrupted storage, landing/takeoff, both physically drivable taxi routes, and actual Havok chassis movement, braking, docking and collisions. Browser tests drive the first services of both flights, verify parallel work, locale changes, pause/resume, reduced motion, hidden tabs, initialization cancellation and repeated renderer replacement. They do not constitute a human completion playtest of every service trip; balancing the full shift remains an early-access iteration.

Development only: `?qa=service&flight=2` starts the ramp directly after **Start shift** for visual/interaction tests. QA runs never write records; production ignores this shortcut. See `PERFORMANCE-REPORT.md` for measured release loading/rendering data and limits.

The handling regression additionally checks steering projected through Babylon's actual camera (including its handedness), keyboard A/D and manual approach arrows, raised equipment under an overhead obstacle, docking with the real aircraft colliders, trailer joints during turns/reversing, trailer contact with a wall, and settlement after driving. These cover the cases that the original straight-line chassis checks missed. See [HANDLING-REPORT.md](HANDLING-REPORT.md) for the current validation, screenshots, bundle totals and power-workload comparison.

The subsequent baggage-train regression measures axle slip, hitch separation, speed and alignment after an S-turn on dry/wet surfaces, reverse speed, tire torque response and settlement. A browser check drives a bend, reverses and resumes forward movement before checking that rendering sleeps. See [TRAILER-REPORT.md](TRAILER-REPORT.md) for this correction and its measurements. Reverse steering remains articulated: straighten the train by pulling forward before a long reverse.

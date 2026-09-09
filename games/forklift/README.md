# Forklift Certified

A desktop browser physics game: deliver an upright piano to Loading Bay B, unload it, and beat your score. Built with TypeScript, Babylon.js, Havok Physics, and Vite. No backend or accounts.

## Install and run

From the repository root, with Node 24 and pnpm 9.9.0:

```sh
pnpm install --frozen-lockfile
pnpm --filter forklift dev
```

Open **http://127.0.0.1:4178/forklift/**. Alternatively, `pnpm dev` starts the portfolio and all games; the game is then at **http://localhost:3000/forklift/**.

The game supports English and Slovak. It inherits the portfolio's saved language; `?lang=sk` or `?lang=en` overrides it. The EN/SK buttons switch the HUD, contextual hints, warehouse signs, pause/results screens, accessibility labels, and number formatting immediately without restarting the current run. Language changes update the URL and the shared `locale` preference.

```sh
pnpm --filter forklift typecheck
pnpm --filter forklift test
pnpm --filter forklift build   # production output: build/forklift/
pnpm build                     # complete portfolio + all games
pnpm preview                   # preview complete production output
```

Serve built output over HTTP(S); opening index.html as a file will not load ES modules or WASM. WebGPU is selected when supported; WebGL is the fallback. Append `?webgl` to force WebGL for compatibility diagnostics. Havok and the WebGPU shader compilers are bundled with the game.

## Controls

| Input | Action |
| --- | --- |
| W / S | Forward / reverse |
| A / D | Steer (reverses naturally when backing up) |
| E / Q | Raise / lower forks |
| T / G | Tilt backward / forward |
| Space | Brake |
| Arrow keys | Orbit camera and change elevation |
| Drag mouse on the game | Orbit camera |
| Escape | Pause / resume |
| R | Instantly restart the shift |
| Speaker button | Mute / unmute sound |
| Sun / moon button | Switch light / dark appearance |

Drive the low forks into the pallet openings. Raise the load just off the floor, tilt back a little, and take the right aisle. Place the entire piano pallet inside the mint zone, level the forks, lower, and reverse clear. The piano must rest upright and nearly motionless for a moment. Audio starts on the first keyboard or mouse interaction. Losing focus pauses the shift.

## Architecture

- `Game.ts`: engine selection, scene lifecycle, fixed physics updates, pause/retry, orchestration.
- `world/Factory.ts`: shared geometry/material and signage helpers; visual geometry is separate from collision geometry.
- `world/Warehouse.ts`: warehouse layout, lights, shadows, environmental props and camera obstacles.
- `world/Cargo.ts`: piano visuals and compound pallet/cabinet rigid body.
- `player/ForkliftController.ts`: dynamic chassis, responsive impulse driving, independently animated physical forks, lift/tilt, wheel visuals.
- `player/FollowCamera.ts`: damped follow/orbit, wall avoidance and collision shake.
- `systems/Physics.ts`: cached Havok initialization, compound rigid bodies and collision filters.
- `systems/Input.ts`: keyboard, mouse and focus handling.
- `systems/MissionManager.ts`: mission definition, contextual state, unloading validation.
- `systems/DamageSystem.ts`: collision damage and displaced-property penalties.
- `systems/ScoringSystem.ts`: pure score calculation and timer formatting.
- `systems/Audio.ts`, `systems/Effects.ts`: procedural sound, limited impact particles and bounded skid marks.
- `ui/UI.ts`, `ui/style.css`: HUD, warehouse map, pause, results, error handling.
- `i18n/index.ts`: typed English/Slovak messages, locale events, and cached number formatters. Mission hints use stable message keys; translated 3D labels redraw on locale changes and unsubscribe when their scene is disposed.
- `ui/SiteAppearance.ts`: portfolio theme/accent preferences and locale-aware return links. The UI imports the site's shared font, color, radius, and navigation styles from `shared/styles`; fonts are self-hosted. Saved appearance carries over from the portfolio, with `?theme=light&accent=cyan` overrides available for previews.
- `ui/Playtest.ts`: development-only timed keyboard command harness, enabled by `?qa`; no teleporting or mission overrides. Removed from production by Vite.

The `MissionDefinition` is the seam for more missions/layouts. Cargo is independent of the controller. Run stats and scoring are separate from the UI, allowing a future leaderboard to consume completed results. Input commands can later be recorded for ghosts. The glTF loader is registered; procedural visual children can be replaced by imported GLB models while retaining authored collision shapes. These are extension points, not implemented networking/replay features.

## Physics and scoring

Havok steps at 120 Hz. The 1,800 kg chassis uses ground friction, acceleration impulses, yaw steering, and locked roll/pitch for predictable arcade driving. This is not a suspension/tire simulator. Animated fork colliders transfer forces to the 240 kg piano without parenting, attaching, or snapping cargo. Separate collision groups stop the carriage hitting its own chassis. The wooden pallet has real gaps for both tines.

Cargo damage uses impact impulse and relative speed. Warehouse penalties are charged once per displaced prop. A hard hit activates an entire rack as a group of rigid bodies; its decks, beams, posts, and boxes can fall. Completion awards `max(1000, 10000 − seconds × 40)`, subtracts 65 points per lost integrity percentage and the property penalty, and adds 1,500 for a near-pristine collision-free run. Incomplete deliveries score zero; total scores never go negative.

## Known limitations

- One warehouse, one cargo type, and one delivery mission; desktop keyboard required.
- Arcade chassis stabilization intentionally prevents rollovers. Forks are animated rigid bodies rather than a fully constrained hydraulic assembly; extreme trapping can exert large forces.
- No backend, leaderboard, daily challenge, ghost, networking, saved runs, or skin selector.
- Restart rebuilds the small scene while reusing Havok WASM. It should take well under a second after assets are loaded, depending on hardware.
- Procedural low-poly art and synthesized sound. No external model or audio assets are required.
- Very aggressive handling may overturn the piano; retry is always available. A zero-integrity piano can still be delivered for a heavily penalized score.
- Browser/GPU support varies. WebGL is the compatibility path; WebGPU requires a working browser adapter.

## Verification

The 14 automated tests cover scoring, valid/invalid delivery states, actual Havok startup stability, reverse, physical pickup and release, a complete route through the warehouse, damage from a loaded collision, and camera clearance at a wall. Run them with `pnpm --filter forklift test`. Rendering-independent physics tests use the same vehicle, cargo, warehouse, and damage systems as the browser.

Browser playtesting covered successful full deliveries on WebGL and WebGPU, the results/Retry button, keyboard restart, and deliberate rack crashes. The prototype was tuned after those runs to fix self-collisions, reverse traction, braking, cargo stability, and aisle clearance.

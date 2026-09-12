# Forklift Certified

A desktop and mobile browser physics game: deliver a piano, fragile ceramics, parcels, and a heavy generator across fourteen warehouse layouts, then beat your score. Built with TypeScript, Babylon.js, Havok Physics, and Vite. No backend or accounts.

On touch devices, drive and steer with the left joystick. Hold the right buttons to raise/lower the forks, tilt the mast or brake, and drag the scene to look around. The driving view sits above the controls, with a wider camera view that keeps the truck visible. The header keeps the mission target, Settings and Pause. Settings contains level selection, garage, work light, sound, theme, accent color and language; mission details and stats are in the pause menu. Fork height and tilt appear while operating the forks. Multiple fingers can drive, operate the forks and move the camera together. Touch controls reset on pause, lost focus, cancelled touches and rotation.

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

Serve built output over HTTP(S); opening index.html as a file will not load ES modules or WASM. The game uses WebGL, retaining the detailed models, PBR materials and lighting. Havok is bundled with the game and preloaded alongside the entry script.

Rendering balances smoothness and battery life: 60 FPS, at most 1.5 million canvas pixels and 1.25× pixel density, 4× MSAA where supported plus FXAA, and disabled sun/work-light shadows. The HUD keeps native CSS resolution. The renderer requests a low-power GPU; the browser decides which adapter to use. Paused menus and results render only when their view changes, and hidden pages stop the render loop. Resuming resets the frame clock to prevent physics catch-up. Physics still steps at 120 Hz independently of the render cap.

## Levels

Open **Settings → Current level** to choose from mission cards with cargo, target time and earned stars. Settings pauses the shift, supports keyboard navigation and Escape, and is also accessible from the pause menu. Completing a delivery offers **Next level**; **R** and **Another shift** retry the current level. All levels are available immediately. The selected level is shareable through `?level=ceramics-a&lang=sk`; unknown IDs fall back to the piano mission.

| Level | Cargo | Route and challenge |
| --- | --- | --- |
| 1 · Piano (`piano-b`) | 240 kg upright piano | Wide load, right aisle, Bay B. |
| 2 · Ceramics (`ceramics-a`) | 180 kg shipping frame with porcelain | Mirrored layout, left aisle, tighter Bay A, 1.8× impact sensitivity. |
| 3 · Generator (`generator-b`) | 540 kg industrial generator | Pickup on the west side, cross below the center racks, heavier handling, tighter Bay B. |
| 4 · Quality control (`quality-control`) | Piano | First two-second inspection stop, Bay B. |
| 5 · Ceramic slalom (`ceramic-slalom`) | Ceramics | Two ordered inspections, staggered safety rails, Bay A. |
| 6 · Heavy detour (`heavy-detour`) | Generator | Two inspections around central storage, Bay A. |
| 7 · Concert tour (`concert-tour`) | Piano | Cross the warehouse between inspections, tighter Bay B. |
| 8 · Precision unloading (`precision-glass`) | Ceramics | Two inspections and a 4.6 m unloading zone. |
| 9 · Warehouse audit (`double-audit`) | Generator | Three inspections and a narrow Bay B. |
| 10 · Master certification (`master-certification`) | Ceramics | Three inspections and the tightest Bay A. |
| 11 · Night shift (`night-shift`) | Parcels | Dark, carton-filled warehouse; truck-mounted work light and emissive dock markers. |
| 12 · A place for everything (`shelf-service`) | Parcels | Store the pallet on the physical R-03 shelf, 1.35 m above the floor. |
| 13 · Cold storage (`cold-storage`) | Ceramics | Blue haze, insulated walls, evaporators, an inspection and the C-02 shelf at 1.65 m. |
| 14 · Last dispatch (`last-dispatch`) | Generator | Warm low sun, high windows, one inspection and a tight final loading bay. |

Inspections require the cargo center inside the amber zone, held 0.2–1.2 m above the floor, upright and nearly motionless for two uninterrupted seconds. The minimap highlights the next inspection; unloading cannot finish until every inspection is complete.

Shelf deliveries require the pallet to rest at the deck's height, upright and still, with the forks withdrawn. Approach from the south with the load low, brake before the shelf, raise the pallet above the deck, level the forks and drive in slowly. Lower the pallet onto the deck; keep the tines in the pallet openings while reversing out. Dropping the cargo on the floor below the shelf does not complete the mission.

A completed delivery earns one star; at least 90% cargo integrity and no property damage earns two; meeting those conditions within the level’s target time earns three. `shared/CampaignProgress.ts` saves best stars and fastest completion independently for each level. Blocked storage retains session progress. Development `?qa` runs never save campaign records.

Every level has physical cargo, warehouse damage, its own target/obstacles and minimap, and English/Slovak objectives and guidance. Changing levels starts a fresh run; changing language preserves it.

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
| F / work-light button | Toggle the truck-mounted work light |
| Garage button | Pause and customize the truck with a rotatable live preview |
| Speaker button | Mute / unmute sound |
| Sun / moon button | Switch light / dark appearance |

Drive the low forks into the pallet openings. Raise the load just off the floor, tilt back a little, and follow the mission’s route hint. Place the entire piano pallet inside the mint zone, level the forks, lower, and reverse clear. The load must rest upright and nearly motionless for a moment. Audio starts on the first keyboard or mouse interaction. Losing focus pauses the shift.

## Garage and models

**Settings → Garage** opens a paused live view of the current truck. Choose twelve body colors, gloss/satin/matte paint, three cab-frame colors, three upholstery colors, an open guard or a solid canopy, three wheel finishes, optional safety stripes, and either classic equipment or a utility kit with a tool case, extinguisher and roof lights. Collapsible sections keep the options manageable. On phones the garage uses a bottom sheet with the rotatable truck preview above it. Changes apply immediately and persist across missions and reloads under `forklift:truck-style:v1`. Earlier garage saves keep their original choices and receive defaults for the new options. Invalid or unavailable storage falls back to a usable default/session selection. Appearance does not alter the collision shapes, mass or handling.

The truck uses smooth rounded body panels, curved solid-rubber tires with tread channels, dished alloy wheels, a contoured seat, an open overhead guard and forged tapered forks. PBR enamel, rubber, vinyl and steel use a small generated warehouse reflection map; its intensity follows night/garage lighting. The rear wheels steer, the wheels and steering wheel rotate, and the mast and hydraulic pistons animate with the lift controls. Hoses, chains, mirrors, pedals, lamps and grille details complete the assembly. Static details are batched by material within their moving or optional parent to limit draw calls. Ceramics use sculpted lathe profiles; parcel stacks have tape, straps and barcodes. The warehouse uses rounded rack/carton edges, tubular bollards, cross-braced racks, wall cladding and clerestory windows. Concrete, wood and cardboard use subtle generated mipmapped surface maps; PBR colors are converted to linear space before lighting. Native display density (up to 2×, bounded to five million pixels), 4× MSAA and FXAA reduce jagged edges, with mipmapping and anisotropic filtering on signs. No external model downloads or new engine are required.

## Architecture

- `Game.ts`: engine selection, scene lifecycle, fixed physics updates, pause/retry, orchestration.
- `world/Factory.ts`: shared geometry/material and signage helpers; visual geometry is separate from collision geometry.
- `world/Warehouse.ts`: warehouse layout, lights, shadows, environmental props and camera obstacles.
- `world/Cargo.ts`: piano, ceramic shipping frame, and generator visuals with compound rigid bodies sharing usable pallet openings.
- `missions/levels.ts`: typed mission catalogue with spawn/pickup positions, destination, cargo mass/fragility, and layout props.
- `player/ForkliftController.ts`: dynamic chassis, responsive impulse driving, independently animated physical forks, lift/tilt, wheel visuals.
- `player/TruckModel.ts`: visual-only vehicle assembly, PBR materials, local reflections, geometry batching and wheel/mast animations.
- `player/TruckGeometry.ts`: smooth rounded solids and extruded forged fork profiles.
- `player/Customization.ts`: validated truck appearance and resilient local persistence.
- `player/FollowCamera.ts`: damped follow/orbit, wall avoidance and collision shake.
- `systems/Physics.ts`: cached Havok initialization, compound rigid bodies and collision filters.
- `systems/LoadResistance.ts`: feeds grounded horizontal cargo contact back to the chassis, limiting pushing to a mass-dependent crawl while leaving insertion, lifting and withdrawal usable.
- `systems/RenderQuality.ts`: display-density correction with a bounded render-buffer budget.
- `world/SurfaceMaterials.ts`: cached PBR surfaces and filtered procedural grain at a consistent physical scale.
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

Havok steps at 120 Hz. The 1,800 kg chassis uses ground friction, acceleration impulses, yaw steering, and locked roll/pitch for predictable arcade driving. This is not a suspension/tire simulator. Animated fork colliders transfer forces to loads of 180–540 kg without parenting, attaching, or snapping cargo. Separate collision groups stop the carriage hitting its own chassis. The wooden pallet has real gaps for both tines. Horizontal contact with grounded cargo now slows the truck to a scraping crawl and damps the sliding load. Real lift clearance releases that resistance; inserting forks without contact and reversing out are not penalized. This prevents the animated carriage from bypassing ground resistance.

Cargo damage uses impact impulse normalized by cargo mass, relative speed, and cargo-specific fragility. Warehouse penalties are charged once per displaced prop. A hard hit activates an entire rack as a group of rigid bodies; its decks, beams, posts, and boxes can fall. Completion awards `max(1000, 10000 − seconds × 40)`, subtracts 65 points per lost integrity percentage and the property penalty, and adds 1,500 for a near-pristine collision-free run. Incomplete deliveries score zero; total scores never go negative.

## Known limitations

- Fourteen missions share a warehouse shell, with different obstacle layouts, lighting, cargo and shelf destinations.
- Ceramic pieces and the generator form a single rigid load; individual components do not shatter. Campaign stars and best times are saved locally; physical run state is not saved.
- Arcade chassis stabilization intentionally prevents rollovers. Forks are animated rigid bodies rather than a fully constrained hydraulic assembly; extreme trapping can exert large forces.
- No backend, leaderboard, daily challenge, ghost, networking, or saved physical runs.
- Restart rebuilds the small scene while reusing Havok WASM. It should take well under a second after assets are loaded, depending on hardware.
- The truck, cargo and warehouse have procedural geometry; key surfaces use PBR materials and generated grain rather than scanned assets. Audio is synthesized. No external model or audio assets are required.
- Very aggressive handling may overturn the piano; retry is always available. A zero-integrity piano can still be delivered for a heavily penalized score.
- Browser/GPU support varies. The game requires WebGL support.

## Verification

The automated tests cover scoring, valid/invalid delivery states, actual Havok startup stability, reverse, physical pickup and release, complete routes for all three missions through real warehouse obstacles, damage from a loaded collision, and camera clearance at a wall. Run them with `pnpm --filter forklift test`. Rendering-independent physics tests use the same vehicle, cargo, warehouse, and damage systems as the browser.

Browser playtesting covered successful full deliveries on WebGL, the results/Retry button, keyboard restart, and deliberate rack crashes. The prototype was tuned after those runs to fix self-collisions, reverse traction, braking, cargo stability, and aisle clearance.

Campaign tests cover all fourteen pickup layouts, full clean Havok deliveries for the original three missions and the new quality-control mission, ordered inspection holds, invalid scan conditions, bilingual content and isolated persistent records.

Night/shelf integration tests complete all four new missions using ordinary controller inputs and actual Havok collisions, including clean shelf placement and withdrawal at both heights. Delivery rule tests reject the wrong height, moving/tipped loads, uncleared forks, and off-center placement. Existing ground-delivery routes remain covered.

Rendering tests cover native/retina pixel density and the large-screen pixel budget. Garage tests cover new choices and migration of earlier saves. Havok regression tests compare grounded pushing, lifting/carrying and reverse withdrawal for piano, ceramics, parcels and generator loads.

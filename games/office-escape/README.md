# Office Escape

A desktop and mobile browser game about leaving work without touching the office floor. Built with TypeScript, Babylon.js, Havok Physics and Vite. All geometry and sound are generated locally; there is no backend.

On touch devices, move with the left joystick and drag the scene to turn the camera. Hold Jump to mantle; use Grab / drop to move furniture and Checkpoint to recover. Tap Sprint to turn it on or off, leaving your other thumb free to jump. Pause, resume and level selection are in the header. Touch controls reset on pause, lost focus, cancelled touches and rotation.

## Setup and commands

From the repository root, using the Node version required by the root package.json and pnpm 9:

```sh
pnpm install
pnpm --filter office-escape dev
```

Open http://127.0.0.1:4179/office-escape/. Running `pnpm dev` starts the portfolio and all games; its `/office-escape/` route proxies this server.

```sh
pnpm --filter office-escape build      # typecheck + production bundle
pnpm --filter office-escape typecheck
pnpm --filter office-escape test
pnpm build                           # portfolio and all games
```

The game builds into `build/office-escape/`. Serve the root `build/` directory to retain the back-to-games links. Vite bundles Havok's WASM locally under the game's base path. Fonts are served locally from the portfolio’s shared font assets, including Slovak diacritics. No external font service is needed.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Camera-relative movement |
| Shift | Sprint |
| Space | Jump; hold near a ledge to mantle |
| Drag mouse | Orbit the third-person camera |
| E | Grab/release nearby movable furniture |
| R | Return to the checkpoint; counts as a fall |
| Esc / pause button | Pause/resume |
| Music button | Mute/unmute |

Click **Let's clock out** to begin. The timer starts on your first movement or jump. Walking away from the tab pauses the game and timer. Use the pause screen to start a fresh run.

## Language and appearance

Use the EN / SK buttons to change language without resetting the run. Menus, hints, results, accessible labels and in-world office signs update immediately. The navigation links lead back to the localized games list and portfolio. `?lang=sk` takes precedence over the saved `locale` preference.

The game uses the same shared fonts, design tokens, navigation and language buttons as the portfolio and other games. Light/dark mode and saved accent colors use the shared `theme` and `accent` preferences; `?theme=light&accent=cyan` can override them. These browser preferences are shared across pages on the same origin; use the root development server when testing navigation between the portfolio and games.

## Rules and routes

Stay on furniture and maintenance platforms. Mint markers and arrows point to the next landing, rings mark safe checkpoints, and orange chairs/carts/boxes can move. Routes now include reception loops, dispatch switchbacks, server aisles, a 22-metre shaft climb, descending rooftop maintenance platforms and a multi-storey atrium. Each level defines its own three-dimensional route, architecture, four named checkpoints and exit position.

Floor detection checks the tagged floor directly below the capsule's feet, including forbidden balcony floors on upper storeys. A continuous 85 ms contact fails the run; furniture, side walls, and transient contacts do not. Recovery takes approximately 320 ms, retains time and falls, restores the latest checkpoint at its original height and resets movable furniture without rebuilding the scene. Restoring furniture prevents a lost cart from making the level impossible.

The first evening keeps the introductory office route and its optional whiteboard shortcut. Later levels change direction, climb and descend, and mix wide checkpoint landings with narrow beams. Drag the mouse to look around corners or find the next ledge above you. Hold Space to mantle; release sprint to brake before a small landing below you. Elevated furniture has a local support height, so cabinet bodies never block a lower route through the same coordinates.

Dragging applies a capped horizontal spring to a nearby body. It slows walking, has a short tether, and never supplies upward force. Chairs and carts have low rectangular collision hulls and damping so they slide without becoming uncontrollable. Boxes and plants can tip. Decorative chair backs, desk legs, monitors and leaves do not snag the player.

Choose any of ten levels in the header; each has a distinct furniture route, target time and color palette. Completion offers the next level and a retry. `?level=last-out&lang=sk` links directly to a floor; invalid IDs select the first evening.

| Level | Challenge |
| --- | --- |
| First evening | Wide, stable furniture in the original office; learn jumping and checkpoints. |
| Visitor badge | Loop around a reception lounge, double back, and climb to a mezzanine card. |
| Rolling stock | Three dispatch lanes with U-turns, rolling carts and loose boxes. |
| Server switchbacks | Sideways server aisles, elevation changes and two timed gates. |
| Lift out of order | Three spiralling circuits up a 22-metre shaft; cards at each landing. |
| Archive expedition | Climb stacks, drop into the returns aisle, then climb to the upper archive. |
| Night shift | Descend from an 18-metre roof through small landings and three gates. |
| Open atrium | Climb around multiple storeys, then cross a narrow bridge over the atrium. |
| Lockdown | Narrow crosswise beams, repeated height changes and four timed gates. |
| Last one out | Rolling dispatch, spiral ascent, skybridge, steep descent and a final roof climb. |

Gold cards are collected by landing on their checkpoint. They survive falls, but a fresh run clears them. A checkpoint cannot advance past a missing earlier card. Gates rotate across the direction of each jump, including sideways and reverse crossings. Red security beams send the player to the saved checkpoint; green opens a crossing window and amber warns 0.8 seconds before reactivation. Pausing freezes the security clock. Recovery resets furniture and retains collected cards.

One star rewards an escape, two require no falls, and three additionally require beating the level’s target time. Personal bests are saved per level under `office-escape:best:v3:<id>`; `shared/CampaignProgress.ts` independently saves best stars and fastest time under `office-escape:routes-v2:campaign:v1:<id>`. Previous route records remain in storage under their old keys and are not compared with the redesigned campaign. Blocked or corrupt storage falls back to session progress. Development `?playtest` runs do not save records.

## Architecture

- `Game.ts`: application lifecycle, system orchestration, pause, recovery and exit transitions.
- `player/PlayerController.ts`: Havok capsule controller, air steering, coyote time, jump buffering, guarded mantling and procedural employee animation.
- `player/FollowCamera.ts`: smooth orbit/follow, obstruction ray and landing impulse.
- `systems/PhysicsInteractionSystem.ts`: Havok initialization, static/dynamic bodies, bounded dragging and furniture reset.
- `systems/FloorDetectionSystem.ts`: continuous contact grace rule, independent of rendering.
- `systems/CheckpointManager.ts`: landed checkpoint activation and respawn positions.
- `systems/RunManager.ts`: timer, falls, completion, best-time persistence.
- `systems/Input.ts`: keyboard/pointer state and focus handling.
- `systems/Audio.ts`: Web Audio footsteps, jumps, landing thumps, rolling, electrical ambience and result cues.
- `world/levels.ts`: ten authored routes, card locations, gate timings, palettes and target times.
- `world/Level.ts`: furniture with local support heights, directional markers, lighting and level-specific exit.
- `world/Architecture.ts`: reception, dispatch, server racks, lift shaft, atrium balconies, archive and rooftop scenery.
- `systems/SecuritySystem.ts`: access cards, checkpoint guards, oriented timed beam visuals and swept collision detection.
- `world/Factory.ts`: reusable geometry, materials and signs.
- `i18n/index.ts`: typed EN/SK dictionaries, language persistence and live scene-label updates.
- `ui/SiteAppearance.ts`: shared theme, accent preferences and localized navigation.
- `ui/UI.ts` and `style.css`: intro, HUD, hints, feedback, pause and results.
- `ui/Playtest.ts`: development-only input driver, dynamically imported only with `?playtest`; excluded from production.

Future levels can reuse the systems with a different route and furniture layout. Online scores, ghosts, daily challenges and an editor are intentionally not implemented.

## Validation

Real Havok integration tests traverse all ten full routes at both 60 and 30 FPS using the player controller, sprint jumps, dynamic furniture, card collection and safe crossing windows. They also verify recovery onto the final checkpoint at its original height. Route invariants check meaningful vertical variety, reachable exit jumps and storey-specific exit detection. Unit tests cover security timing, swept beam collision, card/reset rules, per-level records, sustained versus transient floor contact, out-of-world failure, landed checkpoint activation, forward-only progress, timer lifecycle, improved-best persistence and unavailable/corrupt storage. The portfolio's tests also check catalog integration and routing.

For repeatable browser checks, open `/office-escape/?playtest` on the development server. The visible panel offers:

- **Traverse route**: steer, sprint and jump through the normal route using the real controller; no teleporting or collision bypass.
- **Checkpoint recovery**: reach the break room, walk onto the forbidden floor and verify checkpoint recovery.
- **Shortcut route**: traverse using the narrow whiteboard shortcut.
- **Walk off edge** / **Stop test**: focused manual diagnosis.

The panel reports coordinates, grounded state, velocity, completed landings, falls and checkpoint. Test mode keeps best times in memory, so automated runs do not overwrite a human's record. It is a validation tool, not a ghost or production autoplay feature.

## Known limitations

- Desktop keyboard and mouse controls; no touch or gamepad controller yet.
- First-time completion and replay appeal still need human playtesting against the 3–5 minute target. The automated precision route is considerably faster.
- Collision shapes simplify furniture. Desk legs and small desktop clutter are visual decorations; furniture tops and cabinet bodies are solid.
- Physics is not deterministic across devices. Severe frame stalls can affect jump motion; active timers use wall-clock deltas.
- Moving furniture resets after a fall rather than preserving modifications from earlier attempts.
- Sound is synthesized. No recorded voice, licensed music or externally downloaded art.
- Camera obstruction handling uses a ray; very tight corners may still show brief clipping.
- WebGL and WASM support are required. Babylon and Havok have a noticeable initial download; the build reports a bundle-size warning.

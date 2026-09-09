# Office Escape

A desktop browser game about leaving work without touching the office floor. Built with TypeScript, Babylon.js, Havok Physics and Vite. All geometry and sound are generated locally; there is no backend.

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

Stay on furniture. Mint dots identify the main route, rings mark safe checkpoints, and orange chairs/carts/boxes can move. There are four areas: open office, meeting rooms, coffee break, and the final archive climb. The raised green emergency exit ends the run.

Floor detection checks the tagged floor directly below the capsule's feet. A continuous 85 ms contact fails the run; furniture, side walls, and transient contacts do not. Recovery takes approximately 320 ms, retains time and falls, restores the latest checkpoint and resets movable furniture without rebuilding the scene. Restoring furniture prevents a lost cart from making the level impossible.

The standard route has 21 furniture stops plus the exit landing. Small alternate lines use the archive box and rotating chair in the open office. The advanced meeting-room shortcut uses the narrow, movable whiteboard resting on low cabinets; landing off-center can displace it. Peripheral desks provide more places to experiment. Sprinting and learning the route allow a sub-two-minute finish.

Dragging applies a capped horizontal spring to a nearby body. It slows walking, has a short tether, and never supplies upward force. Chairs and carts have low rectangular collision hulls and damping so they slide without becoming uncontrollable. Boxes and plants can tip. Decorative chair backs, desk legs, monitors and leaves do not snag the player.

Personal best is saved in `localStorage` under `office-escape:best:v1`. Blocked or corrupt storage falls back to a session-only best. A future level should use its own best-time key.

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
- `world/Level.ts`: data-defined furniture route, checkpoint positions, office set dressing, lighting and exit.
- `world/Factory.ts`: reusable geometry, materials and signs.
- `i18n/index.ts`: typed EN/SK dictionaries, language persistence and live scene-label updates.
- `ui/SiteAppearance.ts`: shared theme, accent preferences and localized navigation.
- `ui/UI.ts` and `style.css`: intro, HUD, hints, feedback, pause and results.
- `ui/Playtest.ts`: development-only input driver, dynamically imported only with `?playtest`; excluded from production.

Future levels can reuse the systems with a different route and furniture layout. Online scores, ghosts, daily challenges and an editor are intentionally not implemented.

## Validation

Unit tests cover sustained versus transient floor contact, out-of-world failure, landed checkpoint activation, forward-only progress, timer lifecycle, improved-best persistence and unavailable/corrupt storage. The portfolio's tests also check catalog integration and routing.

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

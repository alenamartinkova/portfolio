# Hexhaven implementation plan

Hexhaven is a standalone game at `/hexhaven/`, linked from the portfolio Games
page. Existing portfolio and LEGO entries remain part of the same static build.

- [x] M0 — Scaffold: isolated strict TypeScript package, pnpm workspace, Vitest,
  lint/format tooling and CI; run typecheck, tests and production build.
- [x] M1 — Coordinates and board: canonical topology, seeded layouts, harbours,
  layout validation and invariant tests.
- [x] M2 — Headless engine: immutable state, canonical legal actions, all rules,
  deterministic replay, trade and dedicated route tests.
- [x] M3 — Bots and simulation: three policies sharing legality, 300 complete
  games, conservation after every action and bounded turn counts.
- [x] M4 — Board in 3D: procedural tabletop, instanced geometry, camera,
  lighting and legal pick targets.
- [x] M5 — Playable: setup, full turn loop, trades, bandit, development cards,
  hotseat, bots and victory.
- [x] M6 — Polish: motion, sound, keyboard, responsive HUD, settings and resume;
  inspect screenshots and refine the art direction.
- [x] M7 — Hardening: real UI smoke, measured performance, screenshots,
  documentation and complete static build.

## M0 plan

Keep the portfolio in its existing Vite entry and put the game's independent
source tree in `hexhaven/src/`. Root pnpm commands validate both projects;
Hexhaven builds into `build/hexhaven/`. Use plain Three.js with a DOM HUD so
rendering and rules have no framework coupling. Install local variable fonts.
No game renderer is created before the engine and simulation milestones pass.

## Validation policy

Run `pnpm typecheck && pnpm test && pnpm build` at each milestone. Once the
simulation runner exists, run it after every core/bot change. Before M3 there is
no simulator to run; this dependency order is recorded rather than hidden by a
dummy command. Commit each completed, validated milestone separately.

## M0 result

Strict typecheck, existing 23 LEGO tests, empty Hexhaven Vitest suite and both
production builds passed. pnpm 9.9.0 is pinned to the installed package manager.
The earlier Games page is now linked from the footer and its mobile layout has
been visually checked. No renderer or engine behavior is included in M0.

## M1 plan

Build topology from canonical triples of grid cells. Test every cell, edge and
vertex against island counts, then validate fixed and seeded random terrain,
tokens and nine coastal harbours. Keep all geometry projection outside core.

## M1 result

20 coordinate/layout tests passed, including 100 randomized seeds. The island
has 19 tiles, 54 vertices, 72 edges, 30 coastal edges and nine harbours using
18 distinct coastal vertices. Typecheck, all tests and build passed on an
isolated copy of the M0 commit plus exactly the M1 files, so concurrent engine
work did not enter this milestone's verification. Lint/format also passed.

## M2 plan

Implement immutable state and a finite list of canonical actions. Resource
discards and trade drafts use individual resource adjustments to avoid a
combinatorial action list. Verify development-card timing, bank shortfalls,
piece counts, all trade paths, blocked roads, award ties and exact replay.
The route suite compares DFS to an independent oracle on 500 small graphs.

## M2 result

Typecheck, 73 Hexhaven tests and the production build passed, alongside all 23
existing portfolio/LEGO tests. Rules tests cover setup, distance, connectivity,
piece exhaustion, seven/discards, bank shortfalls, development-card effects and
timing, bank/harbour/player trades, counteroffers and victory. Replay preserves
the exact state after 400 actions. Malformed runtime actions throw RuleViolation.
No game renderer exists at this milestone.

## M3 plan

Give all three bot difficulties the same evaluator and canonical legal-action
source. Run 300 four-bot games from seed 1, checking resource conservation after
every action and a sole own-turn winner within 400 turns. Print actual win and
turn distributions; never alter game rules to make a simulation finish.

## M4 plan

Build a procedural walnut tabletop around the island. Instance terrain, tokens
and player pieces; cache canvas textures and shared geometry. Use one projection
function, independent pick proxies, legal-only ghosts, bounded orbit controls,
soft shadows and on-demand rendering. The UI will supply allowed targets.

## M3 result

300 games completed with zero RuleViolation errors and conservation checked after
all 110,943 actions. Each game had one winner during their own turn. Turns:
minimum 46, median 86, p90 109, p99 132, maximum 141, mean 85.9. Seat wins:
77 / 74 / 79 / 70. The complete workspace gate passed with 96 Hexhaven tests
and 23 existing tests. The simulator uses Node's tsx import hook to avoid the
tsx CLI's unnecessary local IPC socket. CI now includes the full tournament.

## M5 plan

Wire the scene and a DOM HUD to canonical actions. Support human hand privacy
in hotseat, readable bot turns, all setup/build/trade/card/bandit phases and the
final score breakdown. UI controls select actions from the rules engine; they
never grant legality. Add the completed game to Games.

## M6 plan

Add IndexedDB resume with replay validation, local settings, synthesized muted
audio, keyboard placement, ARIA announcements, responsive controls and state
transition effects. Inspect desktop/mobile screenshots and refine hierarchy,
texture readability and the board's visual character.

## M4 result

The static 3D island was inspected in the browser with zero console errors.
Procedural terrain miniatures, bevelled hexes, tokens, all nine harbours, walnut
tray, sea, glyph-bearing pieces, legal pick proxies and constrained camera are
implemented. Five renderer math/geometry tests pass. Typecheck, 101 tests and
build passed; after visual review the dice tray was moved outside the frame so
it no longer covers the front harbour label. Renderer lint/typecheck passed
again after that adjustment. The M4 entry displays only the static board.

## M5 result

The full application now supports setup, production, trades and counteroffers,
all development-card phases, bandit moves, hotseat privacy, bot turns and the
victory scoreboard. Games lists Hexhaven alongside LEGO. The application also
includes the persistence, settings and keyboard foundations needed for M6.
Typecheck, lint, 101 Hexhaven tests, 23 existing tests and both builds passed.
The desktop browser smoke completed both human setup placements using actual
Tab/Enter controls, rolled 5 + 4, produced two brick, refreshed into an identical
IndexedDB state and downloaded a replay that reproduced the same state. No
browser console errors were emitted. Visual refinement continues in M6.

## M7 plan

Run desktop and 380px touch-browser smoke tests through real setup, production,
refresh and replay export. Load a deterministic late-game position for a 1440p
render-budget measurement. Check that production omits development APIs, record
hardware and measurement limits, save screenshots, and make CI run the same
checks. Document controls, rules decisions and static deployment commands.

## M6 result and visual critique

Reviewed actual desktop, 380px mobile and occupied-board screenshots. Refined
camera framing so the hand no longer covers the front ports, moved terrain
miniatures away from token numerals, settled saved dice immediately, expanded
touch proxies, and preserved the legal ghost after keyboard/tap selection.
Resource feedback now follows actual production, including town quantities and
bank shortfalls. Corrected sentence case, action labels, status contrast and
mobile pieces-left counts. The walnut tray and painted miniatures carry the
visual identity; the HUD remains quiet and structural.

Typecheck, lint, 101 Hexhaven tests, 23 existing tests and production build passed
after these changes. A copy-only core adjustment gives development cards their
readable names in the log; the required 300-game simulation passed again with
the same 110,943 actions and maximum 141 turns. Desktop/mobile smoke and initial
1440p measurements passed; M7 repeats them against the frozen final source.

## M7 result

The final frozen source passed typecheck, lint, all 124 workspace unit tests and
the complete static build. All three Playwright tests passed in 34.4 seconds:
desktop flow, 380px mobile flow, and occupied-board performance/production
isolation. Real setup, resource production, exact refresh resume and exported
replay reconstruction passed without browser errors or horizontal overflow.
Production bundles and the served production page expose no development API.

At 2560×1440 on Apple M1 Max/Chrome 152, the turn-109 board with 47 roads,
16 villages and five towns measured 60.23 active rendered frames/s, 49 draw
calls and 19,093 triangles. Reduced motion produced zero additional rendered
frames over 913ms after settling. Complete JavaScript including Three.js is
165.79kB gzip. Raw measurements and final reviewed screenshots are committed
under `hexhaven/docs/screenshots/`; README records methodology and hardware
limits. CI now runs the browser tests and uploads their report and screenshots.

Verified the built Games catalogue opens both entries, including Hexhaven from
its Slovak card. The complete `build/` directory is ready for static deployment.
No remote deployment, backend, development database or production service was
needed. Each milestone has its own conventional commit.

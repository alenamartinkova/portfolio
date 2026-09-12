# Deploy Friday

`06 / tower defense · on-call` — *it's 16:55. someone just merged.*

Standalone Three.js game at `/deploy-friday/`, registered in the shared games catalog and the EN/SK games page. Uses the existing workspace development proxy and Netlify build output; no backend or external service is involved.

## Run

From the repository root:

```sh
pnpm install
pnpm --filter deploy-friday dev
pnpm --filter deploy-friday test
pnpm --filter deploy-friday typecheck
pnpm --filter deploy-friday build
```

Open `http://127.0.0.1:4180/deploy-friday/?lang=sk`. `pnpm dev` also starts this workspace with the other games. `pnpm build` includes it in `build/deploy-friday/`.

## Play

- Click a tile and choose a service in the radial menu or catalog. Click a tower to upgrade (three levels) or sell (65% of total investment).
- Choose the guided training or level 01 from the level picker. Training uses 11 interactive lessons: all six services, upgrading, restart, hotfix, rollback and mute. Each lesson waits for your action, demonstrates real traffic, then pauses with an explanation. Retry any lesson or reopen training from the runbook.
- Complete four campaign levels in order: **01 Quiet shift** (3 × 60 s, GET/POST), **02 Hello, Hacker News** (4 × 65 s, adds bots), **03 Payload too large** (5 × 70 s, adds uploads and DB migration), **04 Deploy Friday** (7 × 75 s, adds retry storms). Each wave has 15 seconds of quieter traffic. Final stragglers must resolve before victory.
- Start with an API Pod at tile **3, 3**, Valkey at **5, 3**, and optionally Queue at **7, 3**. Keep money for upkeep; spending the full opening €190 can bankrupt the shift before the first request is processed.
- `1`: restart selected/jammed API pod. `2`: rollback exactly 200 ticks, once, including after an incident. `3`: ten-second hotfix, followed by five seconds of debt. `4`: silence alerts for 15 seconds.
- Space pauses; arrows select tiles and Enter opens the build menu. All actions are also available as buttons. The game pauses when the tab is hidden. Runbook and records pause the shift; resume explicitly when ready.
- Sound is opt-in. The interface supports Slovak, English, the shared appearance controls, reduced motion, desktop and tablet layouts.
- Each campaign victory unlocks the next level. Winning level 04 unlocks endless mode. Tutorial completion, campaign progress and scores are stored locally with a session-only fallback. Existing Friday wins retain their unlocks. Nothing is uploaded.

## Rules and architecture

- `src/core/simulation.ts`: browser-independent, fixed 20 Hz simulation, seeded LCG, serializable state, commands, BFS fields and rolling 200-tick rollback history. Default seed is 1655; use `?seed=123` to replay a different Friday. Rendering never draws randomness or advances simulation.
- `src/core/campaign.ts`: mission duration, traffic mix, events and validated local progression.
- `src/core/training.ts`: isolated deterministic scenarios, allowed player actions and completion checks, using the same simulation as the campaign.
- `src/campaign-copy.ts`: Slovak/English mission briefings and step-by-step coaching.
- `src/scene.ts`: orthographic isometric cluster, distinct procedural service models, raycast tile selection, range preview and one `InstancedMesh` for up to 900 request cubes. Traffic overflow damages SLO instead of being silently discarded.
- `src/main.ts`: fixed-step accumulator, localized DOM controls, computed telemetry, audio triggers, local records and application lifecycle.
- `src/audio.ts`: opt-in synthesized server hum and alerts. No downloaded audio assets.
- `src/copy.ts`: English/Slovak runbook, interface and service descriptions.

Services block tiles. BFS to DB and the two routing junctions is recomputed only after construction or sale. Construction cannot close the route or occupy a packet's current/next tile. Load balancers redirect incoming packets through the two reserved junctions; upgraded routing favors the less crowded branch.

GET cache keys use four color variants, expire by TTL, and only affect GET. Queue buffers POSTs without timing out while held. Large uploads impede other traffic and sustained upload work can jam pods; idle ticks reduce strain. Retry timeouts split into three requests, bounded to two generations. Autoscaling requires five nearby requests and adds a per-second charge while active. The DB migration event slows the final approach for 20 seconds.

Cloud income comes from processed requests and a €25 hourly allowance. All services have upkeep; active autoscalers add €0.70/s per level. The runway estimate deliberately excludes future income. Latency is arrival-to-processing time in seconds; error rate counts DB leaks and timeouts among resolved requests. Charts retain 60 seconds of samples and rewind with rollback.

## Validation and scope

Tests cover deterministic replay, costs/refunds, route safety, all request/service behaviors, ability timing, exact rollback, final-wave draining a complete tutorial, campaign unlocks, each mission’s request mix and all four budget-funded campaign victories. Balance was also smoke-tested over seeds 1, 7, 42, 123, 1655, 2026 and 99999 using a fixed build/upgrade strategy.

This is a playable first implementation. The 75-second waves, prices, damage, request mix and jam threshold are deliberately centralized for further human playtesting. Local records are not competitive anti-cheat scores; equal seeds reproduce traffic only with the same player actions. Endless mode continues increasing traffic and HP, with a bounded request pool.

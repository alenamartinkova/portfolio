# Hexhaven decisions

- Original title: **Hexhaven — Traders of the Long Bay**. All visible geometry,
  textures, symbols and sounds are procedural. No commercial edition artwork,
  branding or fonts are used.
- Integration: standalone `hexhaven/` package in this existing portfolio's pnpm
  workspace; deploy at `/hexhaven/` and discover it through `/games/`.
- Rendering: plain Three.js and a DOM HUD. Core has no DOM, React or Three.js
  dependency. Bots and rendering only consume core state and actions.
- Fonts: locally installed Fraunces Variable for display and Public Sans
  Variable for interface text. No runtime font requests to third parties.
- Coordinates: vertex keys include the three touching grid cells, including
  virtual sea cells. A coastal vertex may touch **one** land tile; therefore
  actual land adjacency is 1–3, while canonical identity always contains three
  cells. Requiring every vertex to touch 2–3 land tiles contradicts the specified
  19-tile island with 54 vertices and 72 edges.
- Supply: discarded resources return immediately to the bank. The conserved
  physical supply is bank plus hands = 19 of each resource (95 total). Discards
  in the history are events, not an additional pile to count twice.
- Production shortfall: if several players claim a resource and the bank cannot
  cover the total, none receive it. If only one player claims it, that player
  receives as many as remain in the bank.
- Randomness: use a serialized seeded PRNG. Random actions carry predetermined
  outcomes from the current PRNG state; the reducer verifies these through the
  canonical legal-action list and never calls ambient randomness.
- Milestone order: the requested simulator cannot execute before a rules engine
  and bots exist. Full simulations begin at M3 and run after subsequent core or
  bot edits. Earlier milestones run their own complete validation suite.
- Trade baskets are constructed with canonical per-resource draft-edit actions.
  This supports arbitrary multi-resource offers and counters without enumerating
  millions of possible baskets. Discards similarly choose one resource at a time
  until the required quota is met. UI and bots use the same action list.
- Before the dice roll, only the Guard card is offered, following the requested
  turn sequence. All other playable cards are available after resolving the roll.
- Year of plenty takes two resources when the bank can supply them, or its sole
  remaining resource if only one card remains. An empty bank disables the card.
- Trade Route Charter ties: an unchanged holder retains a tie. If an opponent's
  village shortens the holder's route and multiple players tie for the new
  longest route, nobody holds the Charter, following the requested interruption
  rule. The exact shortened-holder transition has a regression test.
- Local play supports two to four traders, using the same 19-tile island and
  snake setup. Four traders remains the default. There is no online multiplayer,
  account system, matchmaking or external storage.
- Saves contain validated options and the complete action history. IndexedDB
  operations commit in order; loading replays the rules rather than trusting a
  mutable saved snapshot. The local hotseat hand cover provides turn privacy;
  an exported replay contains the full game record.
- Both mouse and touch use select then confirm. Keyboard selection restores the
  same legal ghost. Pick proxies expand to a projected 48px diameter and resolve
  overlaps by the closest visible marker; visual meshes do not decide hits.
- Idle animation is restricted to the sea and throttled through a 42ms timer
  plus requestAnimationFrame (about 20 rendered frames/s on the measured host).
  Interaction and effects run at display refresh. Reduced motion settles the
  board and hidden tabs stop scheduling render frames and bot decisions.
- Performance evidence is measured on an Apple M1 Max with Chrome/ANGLE Metal.
  It demonstrates the specified budgets and approximately 60 active frames/s at
  1440p on that machine; lower-end integrated graphics have not been separately
  benchmarked. CPU submission measurements do not claim GPU execution time.
- No postprocessing or downloaded artwork is used. A bevelled walnut tray and
  small painted terrain miniatures carry the visual emphasis; the HUD uses
  restrained flat surfaces and sentence-case text. Sound is synthesized locally.

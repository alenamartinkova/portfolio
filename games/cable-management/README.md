# Cable Management

A quiet, mouse-and-touch 3D desk puzzle at `/cable-management/`. English and Slovak, with the portfolio's shared appearance controls. No timer, score, accounts or network services.

```sh
pnpm --filter cable-management dev        # localhost:4181/cable-management/
pnpm --filter cable-management test
pnpm --filter cable-management typecheck
pnpm --filter cable-management build
```

Three evenings each contain two Untangle and two Drawer levels. All evening levels can be revisited; completing all twelve opens Daily desk. The daily mode and layout use a versioned seed from the local calendar date at the moment Daily desk is opened. Completion persists in local storage, with an in-memory fallback. Completing evenings removes loose papers and adds a plant and candle.

- **Untangle:** grab any interior point of a cable and drag. Fixed, matching endpoints guarantee a planar solution. Twenty-three-point Verlet chains use damping, slack constraints and soft contact separation without a physics engine. Cables can pass over one another during a drag. Win detection uses camera-projected segment intersections, including collinear overlap and endpoint contact, and waits for 1.1 seconds of calm after a move. Rings mark crossings; endpoint stripes supplement the colors. The help button straightens one cable.
- **Drawer:** a one-layer 6×4, 8×4 or 8×5 grid. Drag a tray object into the drawer, or tap to select and tap a cell. Drag placed objects to reposition them. R rotates; F mirrors the footprint. Mobile buttons provide the same operations. Rotating a placed object returns it to the tray. Tab/Enter selects an inventory object, then arrows and Enter place it on the grid. Grid rules include height bounds and are independent of rendering. The generator packs 87–96% of the board from known polyomino shapes and retains a solution before scrambling orientations. Help places one object in its original position and returns conflicts to the tray.
- Undo restores up to forty changes. Cancelled drags restore the prior layout. Sound is opt-in: synthesized cable rustle, a soft click and filtered room ambience. Hidden tabs pause simulation and sound. Reduced-motion preference removes decorative transitions.

The Three.js scene uses original procedural geometry matching the warm low-poly office style; Office Escape's Babylon.js meshes cannot be directly reused. This first version uses a single drawer layer and fixed cable plugs, without the optional socket-color reconnection objective. No external visual or audio assets are required.

Tests cover solution reconstruction over 300 seeds, rotations/reflections, collision and height rules, deterministic daily layouts, cable contact detection, settling, and resilient save restoration. Browser coverage lives in the root responsive suite.

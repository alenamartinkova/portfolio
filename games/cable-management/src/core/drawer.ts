import { random, shuffle } from './random';

export type Cell = [number, number, number];
export type Kind =
  | 'notebook'
  | 'powerbank'
  | 'stapler'
  | 'mouse'
  | 'adapter'
  | 'scissors'
  | 'usb';
export interface Piece {
  id: number;
  kind: Kind;
  cells: Cell[];
  solution: { cells: Cell[]; origin: Cell };
  position: Cell | null;
}
export interface Drawer {
  width: number;
  depth: number;
  height: number;
  pieces: Piece[];
}
const shapes: { kind: Kind; cells: Cell[] }[] = [
  {
    kind: 'notebook',
    cells: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [2, 1, 0],
    ],
  },
  {
    kind: 'powerbank',
    cells: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  {
    kind: 'stapler',
    cells: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ],
  },
  {
    kind: 'mouse',
    cells: [
      [0, 0, 0],
      [0, 1, 0],
    ],
  },
  {
    kind: 'adapter',
    cells: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ],
  },
  {
    kind: 'scissors',
    cells: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [2, 1, 0],
    ],
  },
  { kind: 'usb', cells: [[0, 0, 0]] },
];

export function normalize(cells: Cell[]): Cell[] {
  const min = [0, 1, 2].map((axis) =>
    Math.min(...cells.map((cell) => cell[axis])),
  );
  return cells.map((cell) => cell.map((v, axis) => v - min[axis]) as Cell);
}
export function transform(cells: Cell[], flip = false): Cell[] {
  return normalize(cells.map(([x, z, y]) => (flip ? [-x, z, y] : [-z, x, y])));
}
export function occupied(cells: Cell[], origin: Cell): Cell[] {
  return cells.map((cell) => cell.map((v, axis) => v + origin[axis]) as Cell);
}
const key = (cell: Cell) => cell.join(',');

export function fits(
  drawer: Drawer,
  piece: Piece,
  origin: Cell,
  cells = piece.cells,
): boolean {
  if (!origin.every(Number.isInteger) || !cells.length) return false;
  const used = new Set(
    drawer.pieces
      .filter((p) => p.id !== piece.id && p.position)
      .flatMap((p) => occupied(p.cells, p.position!).map(key)),
  );
  const target = occupied(cells, origin);
  return (
    new Set(target.map(key)).size === target.length &&
    target.every(
      ([x, z, y]) =>
        Number.isInteger(x) &&
        Number.isInteger(z) &&
        Number.isInteger(y) &&
        x >= 0 &&
        x < drawer.width &&
        z >= 0 &&
        z < drawer.depth &&
        y >= 0 &&
        y < drawer.height &&
        !used.has(key([x, z, y])),
    )
  );
}

export function place(drawer: Drawer, piece: Piece, origin: Cell): boolean {
  if (!fits(drawer, piece, origin)) return false;
  piece.position = [...origin];
  return true;
}

export function drawerComplete(drawer: Drawer): boolean {
  return (
    drawer.pieces.length > 0 &&
    drawer.pieces.every((p) => p.position && fits(drawer, p, p.position))
  );
}

/** Pack known shapes into the solution before applying reversible tray transforms.
 * The final single-cell shapes fill narrow gaps without rejection loops. */
export function generateDrawer(
  seed: number,
  width: number,
  depth: number,
): Drawer {
  const rng = random(seed);
  const drawer: Drawer = { width, depth, height: 1, pieces: [] };
  const target = Math.ceil(width * depth * (0.87 + rng() * 0.09));
  let used = 0;
  for (const origin of Array.from(
    { length: width * depth },
    (_, i) => [i % width, Math.floor(i / width), 0] as Cell,
  )) {
    if (used >= target) break;
    for (const shape of [
      ...shuffle(shapes.slice(0, -1), rng),
      shapes[shapes.length - 1],
    ]) {
      let cells = shape.cells.map((cell) => [...cell] as Cell);
      for (let i = Math.floor(rng() * 4); i > 0; i--) cells = transform(cells);
      if (rng() < 0.5) cells = transform(cells, true);
      const piece: Piece = {
        id: drawer.pieces.length,
        kind: shape.kind,
        cells,
        solution: { cells, origin },
        position: origin,
      };
      if (used + cells.length > target || !fits(drawer, piece, origin))
        continue;
      drawer.pieces.push(piece);
      used += cells.length;
      break;
    }
  }
  // Fill any remaining small gaps up to the intended occupancy.
  for (let z = 0; z < depth && used < target; z++)
    for (let x = 0; x < width && used < target; x++) {
      const cells: Cell[] = [[0, 0, 0]],
        origin: Cell = [x, z, 0];
      const piece: Piece = {
        id: drawer.pieces.length,
        kind: 'usb',
        cells,
        solution: { cells, origin },
        position: origin,
      };
      if (fits(drawer, piece, origin)) {
        drawer.pieces.push(piece);
        used++;
      }
    }
  for (const piece of drawer.pieces) {
    piece.position = null;
    for (let i = Math.floor(rng() * 4); i > 0; i--)
      piece.cells = transform(piece.cells);
    if (rng() < 0.5) piece.cells = transform(piece.cells, true);
  }
  drawer.pieces = shuffle(drawer.pieces, rng);
  return drawer;
}

/** A gentle assist makes room for one original placement, returning conflicts to
 * the tray. It never discards an object or counts an invalid placement as solved. */
export function assist(drawer: Drawer, piece: Piece) {
  const target = new Set(
    occupied(piece.solution.cells, piece.solution.origin).map(key),
  );
  for (const other of drawer.pieces) {
    if (
      other.id !== piece.id &&
      other.position &&
      occupied(other.cells, other.position).some((c) => target.has(key(c)))
    )
      other.position = null;
  }
  piece.cells = piece.solution.cells.map((cell) => [...cell]);
  piece.position = [...piece.solution.origin];
}

import { random } from './random';

export interface Point {
  x: number;
  y: number;
}
export interface Node extends Point {
  px: number;
  py: number;
}
export interface Cable {
  nodes: Node[];
  start: Point;
  end: Point;
  length: number;
}
export interface Grip {
  cable: number;
  node: number;
  target: Point;
}
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const between = (a: Point, b: Point, c: Point) =>
  c.x >= Math.min(a.x, b.x) - 1e-8 &&
  c.x <= Math.max(a.x, b.x) + 1e-8 &&
  c.y >= Math.min(a.y, b.y) - 1e-8 &&
  c.y <= Math.max(a.y, b.y) + 1e-8;

/** Includes touching and overlapping segments: hiding one cable along another
 * must not count as untangled. Coordinates are projected by the scene caller. */
export function intersects(a: Point, b: Point, c: Point, d: Point): boolean {
  const abC = cross(a, b, c),
    abD = cross(a, b, d),
    cdA = cross(c, d, a),
    cdB = cross(c, d, b);
  if (abC * abD < -1e-12 && cdA * cdB < -1e-12) return true;
  return (
    (Math.abs(abC) < 1e-8 && between(a, b, c)) ||
    (Math.abs(abD) < 1e-8 && between(a, b, d)) ||
    (Math.abs(cdA) < 1e-8 && between(c, d, a)) ||
    (Math.abs(cdB) < 1e-8 && between(c, d, b))
  );
}

export function crossings(lines: Point[][]): Point[] {
  const result: Point[] = [];
  for (let a = 0; a < lines.length; a++)
    for (let b = a + 1; b < lines.length; b++) {
      for (let i = 0; i < lines[a].length - 1; i++)
        for (let j = 0; j < lines[b].length - 1; j++) {
          const p = lines[a][i],
            q = lines[a][i + 1],
            r = lines[b][j],
            s = lines[b][j + 1];
          if (!intersects(p, q, r, s)) continue;
          const denominator =
            (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
          const t =
            Math.abs(denominator) < 1e-9
              ? 0.5
              : ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) /
                denominator;
          result.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
        }
    }
  return result;
}

export function generateCables(seed: number, count: number): Cable[] {
  const rng = random(seed);
  return Array.from({ length: count }, (_, index) => {
    const x = -3.9 + (index * 7.8) / (count - 1);
    const start = { x, y: -2.5 },
      end = { x, y: 2.5 };
    const phase = rng() * 0.35;
    const nodes = Array.from({ length: 23 }, (_, i) => {
      const t = i / 22;
      const xx =
        x -
        1.7 * x * Math.sin(Math.PI * t) +
        Math.sin(t * Math.PI * 2) * (0.4 + phase);
      const yy = -2.5 + 5 * t;
      return { x: xx, y: yy, px: xx, py: yy };
    });
    let length = 0;
    for (let i = 1; i < nodes.length; i++)
      length += Math.hypot(
        nodes[i].x - nodes[i - 1].x,
        nodes[i].y - nodes[i - 1].y,
      );
    return { nodes, start, end, length: (length / 22) * 1.15 };
  });
}

export function straighten(cable: Cable) {
  cable.nodes.forEach((node, i) => {
    const t = i / (cable.nodes.length - 1);
    node.x = node.px = cable.start.x + (cable.end.x - cable.start.x) * t;
    node.y = node.py = cable.start.y + (cable.end.y - cable.start.y) * t;
  });
}

/** Damped Verlet chains with maximum-length constraints, surface friction and
 * soft inter-cable separation. Slack is preserved until the player moves it. */
export function stepCables(cables: Cable[], grip: Grip | null): number {
  const fixed = (c: number, n: number) =>
    n === 0 ||
    n === cables[c].nodes.length - 1 ||
    (grip?.cable === c && grip.node === n);
  cables.forEach((cable) =>
    cable.nodes.forEach((node, i) => {
      if (i === 0 || i === cable.nodes.length - 1) return;
      const vx = (node.x - node.px) * 0.62,
        vy = (node.y - node.py) * 0.62;
      node.px = node.x;
      node.py = node.y;
      node.x += Math.abs(vx) < 0.00008 ? 0 : vx;
      node.y += Math.abs(vy) < 0.00008 ? 0 : vy;
    }),
  );
  for (let iteration = 0; iteration < 7; iteration++) {
    cables.forEach((cable, c) => {
      Object.assign(cable.nodes[0], cable.start);
      Object.assign(cable.nodes[cable.nodes.length - 1], cable.end);
      if (grip?.cable === c) Object.assign(cable.nodes[grip.node], grip.target);
      for (let i = 0; i < cable.nodes.length - 1; i++) {
        const a = cable.nodes[i],
          b = cable.nodes[i + 1],
          dx = b.x - a.x,
          dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= cable.length) continue;
        const fa = fixed(c, i),
          fb = fixed(c, i + 1),
          amount = (distance - cable.length) / distance / (fa || fb ? 1 : 2);
        if (!fa) {
          a.x += dx * amount;
          a.y += dy * amount;
        }
        if (!fb) {
          b.x -= dx * amount;
          b.y -= dy * amount;
        }
      }
      for (const node of cable.nodes) {
        node.x = Math.max(-4.65, Math.min(4.65, node.x));
        node.y = Math.max(-2.65, Math.min(2.65, node.y));
      }
    });
  }
  // A held cable may pass over others; once released it settles on the desk.
  for (let a = 0; a < cables.length; a++)
    for (let b = a + 1; b < cables.length; b++) {
      if (grip && (grip.cable === a || grip.cable === b)) continue;
      for (let i = 1; i < 22; i++)
        for (let j = 1; j < 22; j++) {
          const p = cables[a].nodes[i],
            q = cables[b].nodes[j],
            dx = q.x - p.x,
            dy = q.y - p.y,
            d = Math.hypot(dx, dy);
          if (d >= 0.095) continue;
          const nx = d < 1e-8 ? 1 : dx / d,
            ny = d < 1e-8 ? 0 : dy / d,
            amount = (0.095 - d) * 0.18;
          p.x -= nx * amount;
          p.y -= ny * amount;
          q.x += nx * amount;
          q.y += ny * amount;
        }
    }
  let movement = 0;
  for (const cable of cables)
    for (const node of cable.nodes)
      movement = Math.max(
        movement,
        Math.hypot(node.x - node.px, node.y - node.py),
      );
  return movement;
}

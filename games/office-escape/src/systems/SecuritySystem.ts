import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { OfficeLevel, SecurityGate } from '../world/levels';
import type { Factory } from '../world/Factory';
import { PLAYER_HEIGHT } from '../player/PlayerController';
import { t } from '../i18n';
export function gateState(gate: SecurityGate, seconds: number) {
  const phase = ((seconds + gate.phase) % gate.period + gate.period) % gate.period;
  return { active: phase < gate.active, warning: phase >= gate.period - .8,
    safeFor: phase < gate.active ? 0 : gate.period - phase };
}
export function gatePosition(level: OfficeLevel, after: number) {
  const a = level.route[after], b = level.route[after + 1];
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, y: Math.min(a.y, b.y), width: Math.max(a.w, a.d, b.w, b.d) + 1.4, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
}
/** Swept segment catches a player crossing a thin beam between rendered frames. */
export function crossesGate(from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }, gate: { x: number; y: number; z: number; width: number; yaw?: number }) {
  // Transform the swept player segment into the gate's local frame.
  const c = Math.cos(gate.yaw ?? 0), s = Math.sin(gate.yaw ?? 0);
  const local = (p: typeof from) => ({ x: (p.x - gate.x) * c - (p.z - gate.z) * s, y: p.y, z: (p.x - gate.x) * s + (p.z - gate.z) * c });
  from = local(from); to = local(to);
  let enter = 0, leave = 1;
  const bounds = { x: [-gate.width / 2 - .28, gate.width / 2 + .28],
    y: [gate.y - .1, gate.y + 3.6 + PLAYER_HEIGHT / 2], z: [-.25, .25] };
  for (const axis of ['x', 'y', 'z'] as const) {
    const delta = to[axis] - from[axis];
    const [min, max] = bounds[axis];
    if (Math.abs(delta) < .00001) { if (from[axis] < min || from[axis] > max) return false; }
    else {
      const a = (min - from[axis]) / delta, b = (max - from[axis]) / delta;
      enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
      if (enter > leave) return false;
    }
  }
  return true;
}
export class SecuritySystem {
  collected = new Set<number>();
  seconds = 0;
  private cards: { index: number; mesh: Mesh }[] = [];
  private gates: { definition: SecurityGate; position: ReturnType<typeof gatePosition>; beams: Mesh[]; lamp: Mesh }[] = [];
  constructor(private f: Factory, public definition: OfficeLevel) {
    definition.cards.forEach(index => {
      const stop = definition.route[index];
      const mesh = f.box('access card', [.52, .7, .09], [stop.x, stop.y + 1.05, stop.z], '#ffe09a');
      mesh.material = f.mat('#ffe09a', true);
      f.box('badge stripe', [.4, .08, .02], [0, .12, -.06], '#38586b', mesh);
      f.label(() => t('cardSign'), 1.7, .3, [stop.x, stop.y + 1.9, stop.z], '#ffe09a', '#38586b');
      this.cards.push({ index, mesh });
    });
    definition.gates.forEach(definition => {
      const position = gatePosition(this.definition, definition.after);
      const { x, y, z, width, yaw } = position;
      const root = new TransformNode('oriented security gate', f.scene);
      root.position.set(x, y, z); root.rotation.y = yaw;
      for (const side of [-1, 1]) f.box('security post', [.12, 3.7, .12], [side * width / 2, 1.8, 0], '#374f60', root);
      const beams = [.3, 1.3, 2.3, 3.3].map(height => f.box('security beam', [width, .065, .07], [0, height, 0], '#fb7564', root));
      const lamp = f.box('security indicator', [.3, .3, .3], [-width / 2, 3.8, 0], '#fb7564', root);
      const sign = f.label(() => t('securitySign'), width, .38, [0, 4.2, 0], '#f6e1ba', '#374f60');
      sign.parent = root;
      this.gates.push({ definition, position, beams, lamp });
    });
    this.paint();
  }
  get complete() { return this.collected.size === this.cards.length; }
  canSaveCheckpoint(checkpoint: number) {
    return this.definition.cards.every(i => (this.definition.route[i].checkpoint ?? 0) > checkpoint || this.collected.has(i));
  }
  update(dt: number, from: Vector3, to: Vector3, grounded: boolean) {
    this.seconds += dt;
    this.paint();
    if (this.gates.some(g => gateState(g.definition, this.seconds).active && crossesGate(from, to, g.position))) return 'securityHit' as const;
    for (const card of this.cards) {
      card.mesh.rotation.y += dt;
      if (this.collected.has(card.index)) continue;
      const stop = this.definition.route[card.index];
      if (grounded && Math.abs(to.x - stop.x) < stop.w / 2 && Math.abs(to.z - stop.z) < stop.d / 2 && Math.abs(to.y - PLAYER_HEIGHT / 2 - stop.y) < .3) {
        this.collected.add(card.index); card.mesh.setEnabled(false);
        return 'cardCollected' as const;
      }
    }
  }
  private paint() {
    this.gates.forEach(gate => {
      const state = gateState(gate.definition, this.seconds);
      const material = this.f.mat(state.active ? '#fb7564' : state.warning ? '#ffe09a' : '#8bebb3', true);
      gate.beams.forEach(beam => { beam.material = material; beam.visibility = state.active ? 1 : state.warning ? .65 : .1; });
      gate.lamp.material = material;
    });
  }
  reset() { this.seconds = 0; this.collected.clear(); this.cards.forEach(card => card.mesh.setEnabled(true)); this.paint(); }
}

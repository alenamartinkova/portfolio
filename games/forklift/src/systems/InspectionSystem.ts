import type { Point } from '../missions/levels';
/** A checkpoint scans the cargo, never an empty truck. Hold resets on unsafe handling. */
export class InspectionSystem {
  current = 0;
  hold = 0;
  constructor(public stops: readonly Point[]) {}
  get complete() { return this.current === this.stops.length; }
  update(dt: number, p: { x: number; y: number; z: number }, speed: number, upright: number, carried: boolean) {
    const stop = this.stops[this.current];
    if (!stop) return;
    const eligible = carried && Math.abs(p.x - stop[0]) < 1.7 && Math.abs(p.z - stop[1]) < 1.7 &&
      p.y > .2 && p.y < 1.2 && Math.abs(speed) < .3 && upright > .93;
    this.hold = eligible ? this.hold + dt : 0;
    if (this.hold >= 2) { this.current++; this.hold = 0; }
  }
}

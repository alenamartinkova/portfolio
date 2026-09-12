import { ability, build, HZ, Simulation, spawn, upgrade, type Ability, type Kind, type Service } from './simulation';

export type LessonId = Service | 'upgrade' | Ability;
export const LESSONS: readonly LessonId[] = ['pod', 'cache', 'queue', 'limiter', 'balancer', 'autoscaler', 'upgrade', 'restart', 'hotfix', 'rollback', 'mute'];
const BUILD_LESSONS: readonly LessonId[] = ['pod', 'cache', 'queue', 'limiter', 'balancer', 'autoscaler'];
const ABILITY_LESSONS: readonly LessonId[] = ['restart', 'hotfix', 'rollback', 'mute'];

/** Real simulation rules, isolated traffic and explicit completion conditions for each lesson. */
export class Training {
  sim = new Simulation(1655, false, 0);
  index = 0;
  status: 'action' | 'watch' | 'done' = 'action';
  private routes = new Set<number>();
  private queued = false;
  private scaledTicks = 0;
  constructor() { this.prepare(); }
  get lesson() { return LESSONS[this.index]; }
  get isBuild() { return BUILD_LESSONS.includes(this.lesson); }
  get targetCell() { return this.lesson === 'autoscaler' ? 46 : 24; }
  get targetService(): Service | null { return this.isBuild ? this.lesson as Service : null; }
  get targetAbility(): Ability | null { return ABILITY_LESSONS.includes(this.lesson) ? this.lesson as Ability : null; }
  get finished() { return this.index === LESSONS.length - 1 && this.status === 'done'; }
  canBuild(cell: number | null, kind: Service) { return this.status === 'action' && this.isBuild && cell === this.targetCell && kind === this.lesson; }
  canUpgrade(cell: number | null) { return this.status === 'action' && this.lesson === 'upgrade' && cell === 24; }
  canUse(key: Ability) { return this.status === 'action' && key === this.targetAbility; }
  build(cell: number, kind: Service) {
    if (!this.canBuild(cell, kind) || !build(this.sim.state, cell, kind)) return false;
    this.demonstrate(); return true;
  }
  upgrade(cell: number) {
    if (!this.canUpgrade(cell) || !upgrade(this.sim.state, cell)) return false;
    this.demonstrate(); return true;
  }
  useAbility(key: Ability) {
    if (!this.canUse(key)) return false;
    const success = key === 'rollback' ? this.sim.rollback() : ability(this.sim.state, key, 24);
    if (!success) return false;
    if (key === 'rollback' || key === 'mute') this.status = 'done';
    else this.demonstrate();
    return true;
  }
  next() {
    if (this.status !== 'done' || this.finished) return false;
    this.index++; this.prepare(); return true;
  }
  retry() { this.prepare(); }
  private prepare() {
    this.sim = new Simulation(1655, false, 0); this.status = 'action';
    this.routes.clear(); this.queued = false; this.scaledTicks = 0;
    const s = this.sim.state;
    if (this.lesson === 'balancer') {
      // Two visible downstream pods; the learner supplies their missing router.
      build(s, 5, 'pod'); build(s, 71, 'pod');
    }
    if (['autoscaler', 'upgrade', 'restart', 'hotfix', 'rollback'].includes(this.lesson)) build(s, 24, 'pod');
    if (this.targetAbility) this.sim.start();
    if (this.lesson === 'restart') s.towers[0].jammed = true;
    if (this.lesson === 'rollback') {
      // Keep a genuine 10-second snapshot history, then inject a training incident.
      for (let i = 0; i < 11 * HZ; i++) this.sim.step();
      s.slo = 25;
    }
  }
  private inject(kind: Kind, count: number, cell = 35) {
    for (let i = 0; i < count; i++) {
      spawn(this.sim.state, kind);
      const p = this.sim.state.packets.at(-1)!;
      p.cell = cell; p.next = cell; p.color = 1;
    }
  }
  private demonstrate() {
    this.status = 'watch'; this.sim.start();
    switch (this.lesson) {
      case 'pod': this.inject('get', 3); break;
      case 'cache': this.inject('get', 4); break;
      case 'queue': this.inject('post', 3); break;
      case 'limiter': this.inject('bot', 9); break;
      case 'balancer': this.inject('post', 6); break;
      case 'autoscaler': this.inject('post', 10); break;
      case 'upgrade': this.inject('post', 3); break;
      case 'restart': this.inject('get', 2, 33); break;
      case 'hotfix': this.inject('post', 4); break;
    }
  }
  step() {
    if (this.status !== 'watch') return;
    this.sim.step();
    const s = this.sim.state;
    for (const p of s.packets) {
      if (p.waypoint !== null) this.routes.add(p.waypoint);
      if (p.heldBy !== null) this.queued = true;
    }
    if (s.towers.some(t => t.kind === 'autoscaler' && t.active)
      && s.towers.some(t => t.kind === 'pod' && t.targets.length >= 2)) this.scaledTicks++;
    const completed = this.lesson === 'balancer' ? this.routes.size === 2 && s.processed >= 4
      : this.lesson === 'autoscaler' ? this.scaledTicks >= HZ
      : this.lesson === 'queue' ? this.queued && s.processed >= 3
      : this.lesson === 'hotfix' ? s.tick >= s.debtUntil && s.processed >= 4
      : s.packets.length === 0 && s.processed > 0;
    // Hold the scene on the result, including cache hits that happen in one second.
    if (completed && s.tick >= 3 * HZ) this.status = 'done';
  }
}

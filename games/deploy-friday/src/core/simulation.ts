// Deterministic 20 Hz rules. No browser, renderer, clock, or storage dependencies.
export const HZ = 20;
export const WIDTH = 11;
export const HEIGHT = 7;
export const START = 33;
export const DB = 43;
export const WAVE_TICKS = 75 * HZ;
export type Kind = 'get' | 'post' | 'bot' | 'upload' | 'retry';
export type Service = 'pod' | 'cache' | 'balancer' | 'limiter' | 'queue' | 'autoscaler';
export type Ability = 'restart' | 'rollback' | 'hotfix' | 'mute';
export const SERVICES: Record<Service, { cost: number; upkeep: number; range: number; color: number; label: string }> = {
  pod: { cost: 45, upkeep: .12, range: 2.5, color: 0x9b7bff, label: 'API Pod' },
  cache: { cost: 55, upkeep: .07, range: 2.4, color: 0x50dec0, label: 'Valkey' },
  balancer: { cost: 35, upkeep: .06, range: 2.6, color: 0x6faeff, label: 'Load balancer' },
  limiter: { cost: 40, upkeep: .06, range: 2.5, color: 0xf4bc6c, label: 'Rate limiter' },
  queue: { cost: 50, upkeep: .09, range: 2.5, color: 0xee8ebe, label: 'Queue' },
  autoscaler: { cost: 65, upkeep: .05, range: 3.3, color: 0xbcdf80, label: 'Autoscaler' },
};
export const REQUESTS: Record<Kind, { hp: number; speed: number; reward: number; damage: number; color: number }> = {
  get: { hp: 12, speed: .85, reward: 1.8, damage: 2, color: 0x50dec0 },
  post: { hp: 32, speed: .55, reward: 3.8, damage: 4, color: 0x6faeff },
  bot: { hp: 8, speed: 1.05, reward: 1, damage: 1, color: 0xf4bc6c },
  upload: { hp: 145, speed: .29, reward: 14, damage: 12, color: 0xee8ebe },
  retry: { hp: 27, speed: .7, reward: 3, damage: 3, color: 0xff6e83 },
};
export interface Packet {
  id: number; kind: Kind; cell: number; next: number; progress: number; hp: number; maxHp: number;
  born: number; color: number; generation: number; heldBy: number | null; routed: boolean; waypoint: number | null;
}
export interface Tower {
  cell: number; kind: Service; level: number; invested: number; cooldown: number; offline: number;
  jammed: boolean; work: number; memory: Record<number, number>; targets: number[]; active: boolean;
}
export interface Sample { tick: number; latency: number; errors: number; rps: number; budget: number }
export interface State {
  seed: number; rng: number; tick: number; wave: number; phase: 'planning' | 'running' | 'won' | 'lost';
  endless: boolean; budget: number; slo: number; processed: number; leaked: number; timeouts: number;
  latencyTotal: number; spawnMeter: number; nextId: number; towers: Tower[]; packets: Packet[];
  fields: Record<number, number[]>; event: 'deploy' | 'newsletter' | 'hn' | 'migration'; eventUntil: number;
  hotUntil: number; debtUntil: number; mutedUntil: number; cooldowns: Record<Ability, number>; rollbackUsed: boolean;
  samples: Sample[]; recentProcessed: number; recentLeaked: number; recentLatency: number; message: string;
}
export function neighbors(cell: number): number[] {
  const x = cell % WIDTH, y = Math.floor(cell / WIDTH);
  return [x < WIDTH - 1 ? cell + 1 : -1, y > 0 ? cell - WIDTH : -1,
    y < HEIGHT - 1 ? cell + WIDTH : -1, x > 0 ? cell - 1 : -1].filter(n => n >= 0);
}
export function flowField(towers: Tower[], target = DB): number[] {
  const blocked = new Set(towers.map(t => t.cell));
  const field = Array<number>(WIDTH * HEIGHT).fill(-1);
  if (blocked.has(target)) return field;
  const queue = [target]; field[target] = 0;
  for (let i = 0; i < queue.length; i++) {
    for (const cell of neighbors(queue[i])) {
      if (!blocked.has(cell) && field[cell] === -1) {
        field[cell] = field[queue[i]] + 1; queue.push(cell);
      }
    }
  }
  return field;
}
function rebuild(s: State) {
  s.fields = Object.fromEntries([DB, 16, 60].map(target => [target, flowField(s.towers, target)]));
}
function random(s: State) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
export function createState(seed = 1655, endless = false): State {
  const s: State = {
    seed: seed >>> 0, rng: seed >>> 0, tick: 0, wave: 1, phase: 'planning', endless,
    budget: 190, slo: 100, processed: 0, leaked: 0, timeouts: 0, latencyTotal: 0,
    spawnMeter: 0, nextId: 1, towers: [], packets: [], fields: {}, event: 'deploy', eventUntil: 0,
    hotUntil: 0, debtUntil: 0, mutedUntil: 0,
    cooldowns: { restart: 0, rollback: 0, hotfix: 0, mute: 0 }, rollbackUsed: false,
    samples: [], recentProcessed: 0, recentLeaked: 0, recentLatency: 0, message: 'welcome',
  };
  rebuild(s); return s;
}
export function position(p: Packet): { x: number; y: number } {
  return { x: p.cell % WIDTH + (p.next % WIDTH - p.cell % WIDTH) * p.progress,
    y: Math.floor(p.cell / WIDTH) + (Math.floor(p.next / WIDTH) - Math.floor(p.cell / WIDTH)) * p.progress };
}
function distance(cell: number, p: Packet) {
  const pos = position(p);
  return Math.hypot(cell % WIDTH - pos.x, Math.floor(cell / WIDTH) - pos.y);
}
export function burnRate(s: State) {
  return s.towers.reduce((sum, t) => sum + SERVICES[t.kind].upkeep * (1 + (t.level - 1) * .45)
    + (t.kind === 'autoscaler' && t.active ? .7 * t.level : 0), 0);
}
export function upgradeCost(t: Tower) { return Math.round(SERVICES[t.kind].cost * .7 * t.level); }
export function build(s: State, cell: number, kind: Service): boolean {
  if (!['planning', 'running'].includes(s.phase)) return false;
  if (!Number.isInteger(cell) || cell < 0 || cell >= WIDTH * HEIGHT || [START, DB, 16, 60].includes(cell)) {
    s.message = 'reserved'; return false;
  }
  if (s.towers.some(t => t.cell === cell) || s.packets.some(p => p.cell === cell || p.next === cell)) {
    s.message = 'occupied'; return false;
  }
  if (s.budget < SERVICES[kind].cost) { s.message = 'funds'; return false; }
  const tower: Tower = { cell, kind, level: 1, invested: SERVICES[kind].cost, cooldown: 0,
    offline: 0, jammed: false, work: 0, memory: {}, targets: [], active: false };
  const towers = [...s.towers, tower];
  const field = flowField(towers);
  if ([START, 16, 60, ...s.packets.flatMap(p => [p.cell, p.next])].some(c => field[c] < 0)) {
    s.message = 'blocked'; return false;
  }
  s.towers.push(tower); s.budget -= tower.invested; rebuild(s); s.message = 'built'; return true;
}
export function upgrade(s: State, cell: number): boolean {
  const t = s.towers.find(t => t.cell === cell);
  if (!t || t.level >= 3 || !['planning', 'running'].includes(s.phase)) return false;
  const cost = upgradeCost(t);
  if (s.budget < cost) { s.message = 'funds'; return false; }
  s.budget -= cost; t.invested += cost; t.level++; s.message = 'upgraded'; return true;
}
export function sell(s: State, cell: number): boolean {
  const t = s.towers.find(t => t.cell === cell);
  if (!t || !['planning', 'running'].includes(s.phase)) return false;
  s.budget += Math.floor(t.invested * .65);
  for (const p of s.packets) if (p.heldBy === cell) p.heldBy = null;
  s.towers = s.towers.filter(tower => tower !== t);
  rebuild(s); s.message = 'sold'; return true;
}
export function spawn(s: State, kind: Kind, generation = 0) {
  // Bound runaway endless storms, charging overflow to SLO instead of silently dropping it.
  if (s.packets.length >= 900) { s.slo = Math.max(0, s.slo - REQUESTS[kind].damage); s.leaked++; s.recentLeaked++; return; }
  const spec = REQUESTS[kind];
  const hp = spec.hp * (1 + Math.max(0, s.wave - 3) * .09);
  s.packets.push({ id: s.nextId++, kind, cell: START, next: START, progress: 0,
    hp, maxHp: hp, born: s.tick, color: Math.floor(random(s) * 4), generation,
    heldBy: null, routed: false, waypoint: null });
}
export function ability(s: State, key: Exclude<Ability, 'rollback'>, selected: number | null): boolean {
  if (s.phase !== 'running' || s.cooldowns[key] > s.tick) return false;
  if (key === 'restart') {
    const t = s.towers.find(t => t.cell === selected && t.kind === 'pod')
      ?? s.towers.find(t => t.kind === 'pod' && t.jammed);
    if (!t) { s.message = 'selectPod'; return false; }
    t.jammed = false; t.work = 0; t.offline = s.tick + 3 * HZ;
    s.cooldowns.restart = s.tick + 18 * HZ;
  } else if (key === 'hotfix') {
    s.hotUntil = s.tick + 10 * HZ; s.debtUntil = s.hotUntil + 5 * HZ;
    s.cooldowns.hotfix = s.tick + 45 * HZ;
  } else {
    s.mutedUntil = s.tick + 15 * HZ; s.cooldowns.mute = s.tick + 20 * HZ;
  }
  s.message = key; return true;
}
function nextCell(s: State, p: Packet) {
  if (p.cell === p.waypoint) p.waypoint = null;
  const field = s.fields[p.waypoint ?? DB];
  return neighbors(p.cell).find(c => field[c] >= 0 && field[c] < field[p.cell]) ?? p.cell;
}
function waveKind(s: State): Kind {
  const r = random(s);
  if (s.tick < s.eventUntil && s.event === 'newsletter') return r < .88 ? 'get' : 'post';
  if (s.tick < s.eventUntil && s.event === 'hn') return r < .8 ? 'bot' : 'get';
  if (s.wave === 1) return r < .85 ? 'get' : 'post';
  if (s.wave === 2) return r < .55 ? 'get' : r < .85 ? 'post' : 'bot';
  return r < .35 ? 'get' : r < .57 ? 'post' : r < .79 ? 'bot' : r < .89 ? 'upload' : 'retry';
}
export function tick(s: State) {
  if (s.phase !== 'running') return;
  s.tick++;
  const wave = Math.floor((s.tick - 1) / WAVE_TICKS) + 1;
  if (wave !== s.wave && (s.endless || wave <= 7)) {
    s.wave = wave;
    s.event = (['newsletter', 'hn', 'migration'] as const)[Math.floor(random(s) * 3)];
    s.eventUntil = s.tick + 20 * HZ; s.message = s.event;
    s.budget += 25; // Small hourly on-call allowance; still requires processing income.
  }
  const inWave = (s.tick - 1) % WAVE_TICKS;
  if ((s.endless || s.tick <= 7 * WAVE_TICKS) && inWave < 60 * HZ) {
    const spike = s.tick < s.eventUntil && ['newsletter', 'hn'].includes(s.event) ? 1.65 : 1;
    s.spawnMeter += (.7 + (s.wave - 1) * .22) * spike / HZ;
    while (s.spawnMeter >= 1) { s.spawnMeter--; spawn(s, waveKind(s)); }
  }
  const speed = s.tick < s.hotUntil ? 2 : s.tick < s.debtUntil ? .5 : 1;
  // Clear transient rendering signals and compute autoscaling before processing.
  for (const t of s.towers) {
    t.targets = []; t.active = false;
    if (t.cooldown > 0) t.cooldown -= speed;
    if (t.kind === 'autoscaler') {
      const count = s.packets.filter(p => distance(t.cell, p) <= SERVICES[t.kind].range).length;
      t.work = count >= 5 ? t.work + 1 : Math.max(0, t.work - 2);
      t.active = t.work >= (4 - t.level) * HZ;
    }
  }
  s.budget -= burnRate(s) / HZ;
  if (s.budget <= 0) { s.budget = 0; s.phase = 'lost'; s.message = 'bankrupt'; return; }
  const slow = new Set<number>();
  for (const t of s.towers) {
    if (t.offline > s.tick || t.jammed) continue;
    const nearby = s.packets.filter(p => p.hp > 0 && distance(t.cell, p) <= SERVICES[t.kind].range)
      .sort((a, b) => s.fields[DB][a.cell] - s.fields[DB][b.cell] || a.id - b.id);
    if (t.kind === 'balancer') {
      for (const p of nearby) {
        if (p.routed || p.cell % WIDTH >= 5) continue;
        const lanes = [16, 60];
        const lane = t.level > 1
          ? lanes.sort((a, b) => s.packets.filter(r => r.waypoint === a).length - s.packets.filter(r => r.waypoint === b).length)[0]
          : lanes[p.id % 2];
        p.waypoint = lane; p.routed = true; t.targets.push(p.id);
      }
    } else if (t.kind === 'limiter') {
      for (const p of nearby) if (p.kind === 'bot' || t.level >= 2) slow.add(p.id);
      for (const p of nearby.filter(p => p.kind === 'bot').slice(0, t.level * 3)) {
        p.hp -= 18 * speed / HZ; t.targets.push(p.id);
      }
    } else if (t.kind === 'cache' && t.cooldown <= 0) {
      const p = nearby.find(p => p.kind === 'get');
      if (p) {
        if ((t.memory[p.color] ?? 0) > s.tick) p.hp = 0;
        else { t.memory[p.color] = s.tick + (12 + 12 * t.level) * HZ; p.hp -= 3; }
        t.targets.push(p.id); t.cooldown = Math.max(2, 7 - t.level * 2);
      }
    } else if (t.kind === 'queue') {
      const held = s.packets.filter(p => p.heldBy === t.cell && p.hp > 0);
      for (const p of nearby.filter(p => p.kind === 'post' && p.heldBy === null).slice(0, t.level * 3 - held.length)) {
        p.heldBy = t.cell; held.push(p);
      }
      for (const p of held.slice(0, t.level)) { p.hp -= 12 * speed / HZ; t.targets.push(p.id); }
    } else if (t.kind === 'pod') {
      const extra = s.towers.filter(a => a.kind === 'autoscaler' && a.active
        && Math.hypot(a.cell % WIDTH - t.cell % WIDTH, Math.floor(a.cell / WIDTH) - Math.floor(t.cell / WIDTH)) <= SERVICES.autoscaler.range)
        .reduce((sum, a) => sum + a.level, 0);
      let handlingUpload = false;
      for (const p of nearby.slice(0, t.level + extra)) {
        p.hp -= 18 * speed / HZ; t.targets.push(p.id);
        if (p.kind === 'upload') handlingUpload = true;
      }
      t.work = handlingUpload ? t.work + 1 : Math.max(0, t.work - 3);
      if (t.work >= 12 * HZ) { t.jammed = true; s.message = 'jammed'; }
    }
  }
  const retry: number[] = [];
  const survivors: Packet[] = [];
  for (const p of s.packets) {
    if (p.hp <= 0) {
      s.processed++; s.recentProcessed++;
      const latency = (s.tick - p.born) / HZ;
      s.latencyTotal += latency; s.recentLatency += latency;
      s.budget += REQUESTS[p.kind].reward; continue;
    }
    if (s.tick - p.born >= (p.kind === 'retry' ? 18 : 65) * HZ && p.heldBy === null) {
      s.timeouts++; s.leaked++; s.recentLeaked++; s.slo -= REQUESTS[p.kind].damage;
      if (p.kind === 'retry' && p.generation < 2) retry.push(p.generation + 1);
      continue;
    }
    if (p.heldBy === null) {
      if (p.next === p.cell) p.next = nextCell(s, p);
      const blockedByUpload = s.packets.some(other => other !== p && other.kind === 'upload'
        && other.hp > 0 && other.cell === p.next && p.kind !== 'upload');
      const migration = s.event === 'migration' && s.tick < s.eventUntil && p.cell % WIDTH >= 8 ? .45 : 1;
      p.progress += REQUESTS[p.kind].speed / HZ * (slow.has(p.id) ? .35 : 1) * (blockedByUpload ? .15 : 1) * migration;
      if (p.progress >= 1) { p.progress -= 1; p.cell = p.next; p.next = nextCell(s, p); }
    }
    if (p.cell === DB) { s.slo -= REQUESTS[p.kind].damage; s.leaked++; s.recentLeaked++; }
    else survivors.push(p);
  }
  s.packets = survivors;
  for (const generation of retry) for (let i = 0; i < 3; i++) spawn(s, 'retry', generation);
  s.slo = Math.max(0, s.slo);
  if (s.tick % HZ === 0) {
    const count = s.recentProcessed + s.recentLeaked;
    s.samples.push({ tick: s.tick, latency: s.recentProcessed ? s.recentLatency / s.recentProcessed : 0,
      errors: count ? s.recentLeaked / count * 100 : 0, rps: s.recentProcessed, budget: s.budget });
    if (s.samples.length > 60) s.samples.shift();
    s.recentProcessed = 0; s.recentLeaked = 0; s.recentLatency = 0;
  }
  if (s.slo <= 0) { s.phase = 'lost'; s.message = 'incident'; }
  else if (!s.endless && s.tick >= 7 * WAVE_TICKS && s.packets.length === 0) { s.phase = 'won'; s.message = 'survived'; }
}
export class Simulation {
  state: State;
  private history: State[] = [];
  constructor(seed = 1655, endless = false) { this.state = createState(seed, endless); }
  start() { if (this.state.phase === 'planning') this.state.phase = 'running'; }
  step() {
    if (this.state.phase !== 'running') return;
    if (!this.state.rollbackUsed) {
      this.history.push(structuredClone(this.state));
      if (this.history.length > 10 * HZ + 1) this.history.shift();
    }
    tick(this.state);
  }
  rollback(): boolean {
    if (!['running', 'lost'].includes(this.state.phase) || this.state.rollbackUsed) return false;
    const snapshot = [...this.history].reverse().find(s => s.tick <= this.state.tick - 10 * HZ);
    if (!snapshot) { this.state.message = 'rollbackWait'; return false; }
    this.state = structuredClone(snapshot); this.state.rollbackUsed = true;
    this.state.message = 'rollback'; this.history = []; return true;
  }
}

import { describe, expect, it } from 'vitest';
import { ability, build, burnRate, createState, DB, flowField, HZ, sell, Simulation, spawn, START, tick, upgrade, WAVE_TICKS, type Service, type State } from '../src/core/simulation';

function run(s: State, ticks: number) { for (let i = 0; i < ticks; i++) tick(s); }
function quiet() { const s = createState(42); s.phase = 'running'; s.tick = 61 * HZ; return s; }

describe('deterministic production rules', () => {
  it('replays the same seed and actions exactly', () => {
    const a = createState(2026), b = createState(2026);
    for (const s of [a, b]) { build(s, 24, 'pod'); build(s, 26, 'cache'); s.phase = 'running'; run(s, 120 * HZ); }
    expect(a).toEqual(b);
    const c = createState(2027); build(c, 24, 'pod'); build(c, 26, 'cache'); c.phase = 'running'; run(c, 120 * HZ);
    expect(c.rng).not.toEqual(a.rng);
  });
  it('charges nothing while planning and deducts exact upkeep when running', () => {
    const s = quiet(); build(s, 24, 'pod'); build(s, 26, 'cache');
    const before = s.budget;
    s.phase = 'planning'; run(s, 200); expect(s.budget).toBe(before);
    s.phase = 'running'; run(s, HZ); expect(s.budget).toBeCloseTo(before - .19, 8);
  });
  it('keeps spawn, DB, junctions and in-flight request cells clear', () => {
    const s = quiet();
    for (const cell of [START, DB, 16, 60, -1, 77, 1.5]) expect(build(s, cell, 'pod')).toBe(false);
    spawn(s, 'get'); s.packets[0].next = 34;
    expect(build(s, 34, 'pod')).toBe(false);
  });
  it('rejects a sealed route atomically and reroutes around a valid tower', () => {
    const s = createState(); s.budget = 1000;
    expect(build(s, 34, 'pod')).toBe(true);
    expect(s.fields[DB][START]).toBeGreaterThan(10);
    expect(build(s, 22, 'pod')).toBe(true);
    const before = structuredClone(s);
    expect(build(s, 44, 'pod')).toBe(false);
    expect(s.budget).toBe(before.budget); expect(s.towers).toEqual(before.towers);
    expect(flowField(s.towers)[START]).toBeGreaterThan(0);
  });
  it('limits upgrades, rejects unaffordable actions and refunds invested cost', () => {
    const s = createState(); build(s, 24, 'pod'); upgrade(s, 24); upgrade(s, 24);
    expect(s.towers[0].level).toBe(3); expect(upgrade(s, 24)).toBe(false);
    const before = s.budget, invested = s.towers[0].invested;
    expect(build(s, 26, 'autoscaler')).toBe(false);
    sell(s, 24); expect(s.budget).toBe(before + Math.floor(invested * .65));
    expect(s.fields[DB][START]).toBe(10);
  });
  it('processes requests for income, leaks damage SLO, and zero budget ends the game', () => {
    const s = quiet(); build(s, 24, 'pod'); spawn(s, 'get');
    s.packets[0].cell = 35; s.packets[0].next = 35;
    run(s, HZ); expect(s.processed).toBe(1); expect(s.slo).toBe(100);
    spawn(s, 'upload'); const p = s.packets.at(-1)!; p.cell = DB; p.next = DB;
    tick(s); expect(s.slo).toBe(88); expect(s.leaked).toBe(1);
    s.budget = .001; tick(s); expect(s.phase).toBe('lost'); expect(s.message).toBe('bankrupt');
  });
  it('learns GET colors and instantly hits them, while bots bypass the cache', () => {
    const s = quiet(); build(s, 24, 'cache'); spawn(s, 'get'); spawn(s, 'bot');
    for (const p of s.packets) { p.cell = 35; p.next = 35; }
    const get = s.packets[0], bot = s.packets[1]; get.color = 2;
    tick(s); expect(get.hp).toBe(9); expect(bot.hp).toBe(8);
    run(s, 6); expect(s.processed).toBe(1); expect(s.packets[0].kind).toBe('bot');
  });
  it('buffers POSTs without timing out and releases them if the queue is sold', () => {
    const s = quiet(); build(s, 24, 'queue'); spawn(s, 'post');
    const p = s.packets[0]; p.cell = 35; p.next = 36; p.hp = 10000;
    tick(s); expect(p.heldBy).toBe(24); const progress = p.progress;
    run(s, 30); expect(p.progress).toBe(progress);
    p.born = s.tick - 100 * HZ; tick(s); expect(s.timeouts).toBe(0);
    sell(s, 24); expect(p.heldBy).toBe(null); tick(s); expect(s.timeouts).toBe(1);
  });
  it('splits retries into three on timeout, but not after processing', () => {
    const s = quiet(); spawn(s, 'retry'); s.packets[0].born = s.tick - 18 * HZ;
    tick(s); expect(s.packets).toHaveLength(3); expect(s.timeouts).toBe(1);
    expect(s.packets.every(p => p.generation === 1)).toBe(true);
    s.packets.forEach(p => p.hp = 0); tick(s); expect(s.packets).toHaveLength(0); expect(s.processed).toBe(3);
    spawn(s, 'retry', 2); s.packets[0].born = s.tick - 18 * HZ; tick(s); expect(s.packets).toHaveLength(0);
  });
  it('slows and drops bots without treating normal traffic as bots', () => {
    const s = quiet(); build(s, 24, 'limiter'); spawn(s, 'bot'); spawn(s, 'post');
    for (const p of s.packets) { p.cell = 35; p.next = 36; }
    const post = s.packets[1]; tick(s); expect(post.hp).toBe(32);
    expect(s.packets[0].progress).toBeLessThan(post.progress);
    run(s, HZ); expect(s.processed).toBe(1);
  });
  it('routes traffic via both junctions and scales nearby pods at an explicit cost', () => {
    const s = quiet(); s.budget = 1000;
    build(s, 24, 'balancer');
    spawn(s, 'get'); spawn(s, 'get'); for (const p of s.packets) { p.cell = 35; p.next = 35; }
    tick(s); expect(new Set(s.packets.map(p => p.waypoint))).toEqual(new Set([16, 60]));
    sell(s, 24); build(s, 24, 'autoscaler');
    for (let i = 0; i < 6; i++) spawn(s, 'upload');
    for (const p of s.packets) { p.cell = 35; p.next = 35; }
    run(s, 3 * HZ); expect(s.towers[0].active).toBe(true); expect(burnRate(s)).toBeCloseTo(.75);
  });
  it('requires a pod to restart and applies a three-second outage and cooldown', () => {
    const s = quiet(); expect(ability(s, 'restart', null)).toBe(false);
    build(s, 24, 'pod'); s.towers[0].jammed = true;
    expect(ability(s, 'restart', null)).toBe(true); expect(s.towers[0].jammed).toBe(false);
    expect(s.towers[0].offline).toBe(s.tick + 60); expect(ability(s, 'restart', 24)).toBe(false);
  });
  it('hotfix doubles processing, then debt halves it; mute leaves gameplay unchanged', () => {
    const normal = quiet(); build(normal, 24, 'pod'); spawn(normal, 'upload');
    normal.packets[0].cell = 35; normal.packets[0].next = 35;
    const hot = structuredClone(normal), muted = structuredClone(normal);
    ability(hot, 'hotfix', 24); ability(muted, 'mute', 24);
    run(normal, 10); run(hot, 10); run(muted, 10);
    expect(145 - hot.packets[0].hp).toBeCloseTo((145 - normal.packets[0].hp) * 2);
    expect(muted.packets).toEqual(normal.packets); expect(muted.budget).toBe(normal.budget);
    hot.tick = hot.hotUntil; const before = hot.packets[0].hp; tick(hot);
    expect(before - hot.packets[0].hp).toBeCloseTo(18 / HZ / 2);
  });
  it('restores the exact tick, budget, towers, requests and RNG once, even after losing', () => {
    const sim = new Simulation(123); sim.start();
    for (let i = 0; i < 57; i++) sim.step();
    const expected = structuredClone(sim.state);
    sim.step();
    build(sim.state, 24, 'pod');
    for (let i = 0; i < 199; i++) sim.step();
    sim.state.phase = 'lost';
    expect(sim.rollback()).toBe(true);
    expect(sim.state).toEqual({ ...expected, rollbackUsed: true, message: 'rollback' });
    expect(sim.rollback()).toBe(false);
  });
  it('advances events and awards victory only after the last requests are gone', () => {
    const s = quiet(); s.tick = WAVE_TICKS; tick(s); expect(s.wave).toBe(2); expect(s.event).not.toBe('deploy');
    s.tick = 7 * WAVE_TICKS; spawn(s, 'get'); tick(s); expect(s.phase).toBe('running');
    s.packets = []; tick(s); expect(s.phase).toBe('won');
    const endless = createState(42, true); endless.phase = 'running'; endless.tick = 7 * WAVE_TICKS;
    tick(endless); expect(endless.wave).toBe(8); expect(endless.phase).toBe('running');
  });
  it('supports a complete seven-wave Friday with a budget-funded build and upgrades', () => {
    const s = createState(1655);
    const plan: [number, Service][] = [[24, 'pod'], [26, 'cache'], [28, 'queue'], [46, 'limiter'], [48, 'pod'], [50, 'pod'], [30, 'pod'], [49, 'autoscaler'], [52, 'pod'], [25, 'pod']];
    let next = 0;
    while (next < 3 && build(s, ...plan[next])) next++;
    s.phase = 'running';
    for (let i = 0; i < 600 * HZ && s.phase === 'running'; i++) {
      if (i % HZ === 0) {
        if (next < plan.length && s.budget >= 65 && build(s, ...plan[next])) next++;
        else for (const tower of s.towers) if (s.budget > 120 && tower.level < 3) { upgrade(s, tower.cell); break; }
        if (s.towers.some(t => t.jammed)) ability(s, 'restart', null);
        if (s.packets.length > 10) ability(s, 'hotfix', null);
      }
      tick(s);
    }
    expect(s.phase, JSON.stringify({ wave: s.wave, slo: s.slo, budget: s.budget, served: s.processed })).toBe('won');
    expect(s.budget).toBeGreaterThan(0);
  });
});

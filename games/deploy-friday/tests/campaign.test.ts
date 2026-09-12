import { describe, expect, it } from 'vitest';
import { MISSIONS, canPlay, mission, parseProgress, recordVictory, type MissionId } from '../src/core/campaign';
import { ability, build, createState, HZ, tick, upgrade, type Service } from '../src/core/simulation';
import { LESSONS, Training } from '../src/core/training';

function performLesson(training: Training) {
  if (training.isBuild) expect(training.build(training.targetCell, training.targetService!)).toBe(true);
  else if (training.lesson === 'upgrade') expect(training.upgrade(24)).toBe(true);
  else expect(training.useAbility(training.targetAbility!)).toBe(true);
  for (let i = 0; i < 60 * HZ && training.status === 'watch'; i++) training.step();
}

describe('guided training level', () => {
  it('lets the player demonstrate every service, upgrade and all four abilities with real rules', () => {
    const training = new Training();
    const seen: string[] = [];
    do {
      seen.push(training.lesson);
      performLesson(training);
      expect(training.status, `${training.lesson}: ${JSON.stringify({ tick: training.sim.state.tick, processed: training.sim.state.processed, packets: training.sim.state.packets.length })}`).toBe('done');
      expect(training.sim.state.mission).toBe(0);
      expect(training.sim.state.phase).not.toBe('won');
      expect(training.sim.state.budget).toBeGreaterThan(0);
      if (training.lesson === 'rollback') expect(training.sim.state.slo).toBe(100);
    } while (training.next());
    expect(seen).toEqual(LESSONS);
    expect(training.finished).toBe(true);
  });
  it('waits for the player, rejects incorrect actions and cannot skip unfinished lessons', () => {
    const training = new Training(), before = structuredClone(training.sim.state);
    for (let i = 0; i < 1000; i++) training.step();
    expect(training.sim.state).toEqual(before);
    expect(training.next()).toBe(false);
    expect(training.build(25, 'pod')).toBe(false);
    expect(training.build(24, 'cache')).toBe(false);
    expect(training.useAbility('hotfix')).toBe(false);
    expect(training.upgrade(24)).toBe(false);
    expect(training.sim.state).toEqual(before);
  });
  it('retries a lesson with fresh traffic and budget and holds a completed demonstration', () => {
    const training = new Training();
    const before = structuredClone(training.sim.state);
    performLesson(training);
    const done = structuredClone(training.sim.state);
    for (let i = 0; i < 1000; i++) training.step();
    expect(training.sim.state).toEqual(done);
    training.retry(); expect(training.status).toBe('action');
    expect(training.sim.state).toEqual(before);
  });
  it('training cannot unlock a campaign level or endless mode', () => {
    const training = new Training(), progress = parseProgress(null);
    do { performLesson(training); } while (training.next());
    expect(recordVictory(progress, training.sim.state)).toEqual(progress);
    expect(canPlay(progress, 2)).toBe(false);
  });
});

describe('campaign difficulty and progression', () => {
  it('unlocks the next level only after victory and preserves legacy Friday wins', () => {
    let progress = parseProgress(null);
    expect([0, 1, 2, 3, 4].map(id => canPlay(progress, id as MissionId))).toEqual([true, true, false, false, false]);
    const s = createState(1, false, 1); s.phase = 'lost';
    expect(recordVictory(progress, s)).toEqual(progress);
    s.phase = 'won'; progress = recordVictory(progress, s);
    expect(canPlay(progress, 2)).toBe(true); expect(canPlay(progress, 3)).toBe(false);
    expect(recordVictory(progress, s)).toEqual(progress);
    expect(parseProgress('{bad json')).toEqual({ completed: [] });
    expect(parseProgress('{"completed":[0,1,1,8,-1,"4",null]}')).toEqual({ completed: [0, 1] });
    const legacy = parseProgress(null, true);
    expect([1, 2, 3, 4].every(id => canPlay(legacy, id as MissionId))).toBe(true);
    expect(legacy.completed).toContain(4);
  });
  it.each([1, 2, 3, 4] as const)('level %i only spawns its introduced request types', id => {
    const s = createState(4242, false, id), level = mission(id);
    s.phase = 'running'; s.slo = 100000;
    const seen = new Set<string>();
    for (let i = 0; i < level.waves * level.waveSeconds * HZ; i++) {
      tick(s); s.packets.forEach(p => seen.add(p.kind));
    }
    expect([...seen].every(kind => level.kinds.includes(kind as typeof level.kinds[number]))).toBe(true);
    expect(new Set(level.kinds)).toEqual(seen);
    expect(s.wave).toBe(level.waves);
  });
  it.each([1, 2, 3, 4] as const)('level %i can be won with an affordable build-and-upgrade strategy', id => {
    const s = createState(1655, false, id);
    const plan: [number, Service][] = [[24, 'pod'], [26, 'cache'], [28, 'queue'], [46, 'limiter'], [48, 'pod'], [50, 'pod'], [30, 'pod'], [49, 'autoscaler'], [52, 'pod'], [25, 'pod']];
    let next = 0;
    while (next < 3 && build(s, ...plan[next])) next++;
    s.phase = 'running';
    for (let i = 0; i < 650 * HZ && s.phase === 'running'; i++) {
      if (i % HZ === 0) {
        if (next < plan.length && s.budget >= 85 && build(s, ...plan[next])) next++;
        else for (const tower of s.towers) if (s.budget > 120 && tower.level < 3) { upgrade(s, tower.cell); break; }
        if (s.towers.some(t => t.jammed)) ability(s, 'restart', null);
        if (s.packets.length > 10) ability(s, 'hotfix', null);
      }
      tick(s);
    }
    expect(s.phase, `level ${id}, wave ${s.wave}, SLO ${s.slo}, €${s.budget}`).toBe('won');
    expect(s.tick).toBeGreaterThanOrEqual(mission(id).waves * mission(id).waveSeconds * HZ);
  });
  it('ends a short mission at its own final wave, while endless continues beyond the campaign', () => {
    const short = createState(1, false, 1); short.phase = 'running'; short.tick = 3 * 60 * HZ;
    tick(short); expect(short.phase).toBe('won');
    const endless = createState(1, true, 4); endless.phase = 'running'; endless.tick = 7 * 75 * HZ;
    tick(endless); expect(endless.phase).toBe('running'); expect(endless.wave).toBe(8);
    expect(MISSIONS.slice(1).map(level => level.waves)).toEqual([3, 4, 5, 7]);
  });
});

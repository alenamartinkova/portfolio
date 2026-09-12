import type { Kind, State } from './simulation';

export type MissionId = 0 | 1 | 2 | 3 | 4;
export interface Mission {
  id: MissionId; waves: number; waveSeconds: number; budget: number; baseRate: number; rateGrowth: number;
  kinds: readonly Kind[]; events: readonly ('newsletter' | 'hn' | 'migration')[];
}
export const MISSIONS: readonly Mission[] = [
  { id: 0, waves: 0, waveSeconds: 75, budget: 190, baseRate: 0, rateGrowth: 0, kinds: [], events: [] },
  { id: 1, waves: 3, waveSeconds: 60, budget: 190, baseRate: .55, rateGrowth: .10, kinds: ['get', 'post'], events: ['newsletter'] },
  { id: 2, waves: 4, waveSeconds: 65, budget: 190, baseRate: .65, rateGrowth: .14, kinds: ['get', 'post', 'bot'], events: ['newsletter', 'hn'] },
  { id: 3, waves: 5, waveSeconds: 70, budget: 190, baseRate: .7, rateGrowth: .18, kinds: ['get', 'post', 'bot', 'upload'], events: ['hn', 'migration'] },
  { id: 4, waves: 7, waveSeconds: 75, budget: 190, baseRate: .7, rateGrowth: .22, kinds: ['get', 'post', 'bot', 'upload', 'retry'], events: ['newsletter', 'hn', 'migration'] },
];
export function mission(id: MissionId) { return MISSIONS[id]; }
export interface CampaignProgress { completed: MissionId[] }
export function parseProgress(raw: string | null, legacyFridayWon = false): CampaignProgress {
  let completed: MissionId[] = [];
  try {
    const value: unknown = JSON.parse(raw ?? '{}');
    if (value && typeof value === 'object' && 'completed' in value && Array.isArray(value.completed)) {
      completed = [...new Set(value.completed.filter((id): id is MissionId => Number.isInteger(id) && id >= 0 && id <= 4))];
    }
  } catch { /* Corrupt or blocked storage starts a fresh local campaign. */ }
  if (legacyFridayWon) completed = [...new Set<MissionId>([...completed, 1, 2, 3, 4])];
  return { completed: completed.sort() };
}
export function canPlay(progress: CampaignProgress, id: MissionId) {
  return id <= 1 || progress.completed.some(done => done >= id - 1);
}
export function recordVictory(progress: CampaignProgress, state: State): CampaignProgress {
  if (state.phase !== 'won' || state.endless || state.mission === 0) return progress;
  return { completed: [...new Set([...progress.completed, state.mission])].sort() };
}

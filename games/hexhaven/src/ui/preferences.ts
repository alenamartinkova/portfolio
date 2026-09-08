import type { Difficulty } from '../core/state';

export type AnimationSpeed = 'slow' | 'normal' | 'fast';

export interface Settings {
  readonly animationSpeed: AnimationSpeed;
  readonly sound: boolean;
  readonly colorBlind: boolean;
  readonly layout: 'beginner' | 'random';
  readonly botCount: number;
  readonly difficulty: Difficulty;
  readonly playerCount: number;
  readonly seed: number;
}

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  animationSpeed: 'normal',
  sound: false,
  colorBlind: false,
  layout: 'beginner',
  botCount: 3,
  difficulty: 'normal',
  playerCount: 4,
  seed: 2026,
});

/** Recover valid individual preferences while keeping missing/invalid ones safe. */
export function normalizeSettings(input: unknown): Settings {
  if (typeof input !== 'object' || input === null) return { ...DEFAULT_SETTINGS };
  const value: Record<string, unknown> = Object.fromEntries(Object.entries(input));
  const playerCount =
    typeof value.playerCount === 'number' &&
    Number.isInteger(value.playerCount) &&
    value.playerCount >= 2 &&
    value.playerCount <= 4
      ? value.playerCount
      : DEFAULT_SETTINGS.playerCount;
  const botCount =
    typeof value.botCount === 'number' &&
    Number.isInteger(value.botCount) &&
    value.botCount >= 0 &&
    value.botCount <= 3
      ? value.botCount
      : DEFAULT_SETTINGS.botCount;
  return {
    animationSpeed:
      value.animationSpeed === 'slow' ||
      value.animationSpeed === 'fast' ||
      value.animationSpeed === 'normal'
        ? value.animationSpeed
        : DEFAULT_SETTINGS.animationSpeed,
    sound: typeof value.sound === 'boolean' ? value.sound : DEFAULT_SETTINGS.sound,
    colorBlind:
      typeof value.colorBlind === 'boolean' ? value.colorBlind : DEFAULT_SETTINGS.colorBlind,
    layout:
      value.layout === 'beginner' || value.layout === 'random'
        ? value.layout
        : DEFAULT_SETTINGS.layout,
    botCount: Math.min(botCount, playerCount - 1),
    difficulty:
      value.difficulty === 'easy' || value.difficulty === 'normal' || value.difficulty === 'hard'
        ? value.difficulty
        : DEFAULT_SETTINGS.difficulty,
    playerCount,
    seed:
      typeof value.seed === 'number' && Number.isSafeInteger(value.seed)
        ? value.seed
        : DEFAULT_SETTINGS.seed,
  };
}

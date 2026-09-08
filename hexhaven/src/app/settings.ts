import { DEFAULT_SETTINGS, normalizeSettings } from '../ui/preferences';
import type { Settings } from '../ui/preferences';
export { DEFAULT_SETTINGS, normalizeSettings } from '../ui/preferences';
export type { AnimationSpeed, Settings } from '../ui/preferences';

const KEY = 'hexhaven.settings';

export function loadSettings(): Settings {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
    const saved = localStorage.getItem(KEY);
    return saved === null
      ? { ...DEFAULT_SETTINGS }
      : normalizeSettings(JSON.parse(saved) as unknown);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** False lets the UI explain that the preference only applies to this session. */
export function saveSettings(settings: Settings): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

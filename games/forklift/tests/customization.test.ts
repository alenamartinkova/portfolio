import { afterEach, expect, it, vi } from 'vitest';
import { defaultStyle, normalizeStyle, readStyle, saveStyle } from '../src/player/Customization';

afterEach(() => vi.unstubAllGlobals());

it('restores truck selections across sessions', () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const chosen = { ...defaultStyle, finish: 'matte' as const, frame: '#bcc5c9', seat: '#85583b', roof: 'canopy' as const, paint: '#dc674d', rims: '#dab567', stripes: false, kit: 'utility' as const };
  saveStyle(chosen);
  expect(readStyle()).toEqual(chosen);
});

it('ignores corrupt and outdated appearance values', () => {
  expect(normalizeStyle({ paint: 'invalid', rims: '#000000', stripes: 'false', kit: 'missing' })).toEqual(defaultStyle);
  vi.stubGlobal('localStorage', { getItem: () => '{broken' });
  expect(readStyle()).toEqual(defaultStyle);
});

it('remains usable when storage is blocked', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => { throw Error('blocked'); },
    setItem: () => { throw Error('blocked'); },
  });
  expect(readStyle()).toEqual(defaultStyle);
  expect(() => saveStyle(defaultStyle)).not.toThrow();
});

it('migrates earlier garage saves without losing existing choices', () => {
  const old = { paint: '#6699de', rims: '#dab567', stripes: false, kit: 'utility' };
  expect(normalizeStyle(old)).toEqual({ ...defaultStyle, ...old });
  expect(normalizeStyle({ ...old, finish: 'invalid', frame: '#ffffff', seat: null, roof: 'glass' })).toEqual({ ...defaultStyle, ...old });
});

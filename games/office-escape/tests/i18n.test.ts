import { afterEach, describe, expect, it } from 'vitest';
import { en, sk, setLocale, t, furnitureName, onLocaleChange, areaHints, areaNames } from '../src/i18n';
afterEach(() => setLocale('en'));
describe('Office Escape localization', () => {
  it('covers every English string and interpolation in Slovak', () => {
    expect(Object.keys(sk).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(sk[key].trim().length).toBeGreaterThan(0);
      expect(sk[key].match(/\{\w+\}/g)).toEqual(en[key].match(/\{\w+\}/g));
    }
  });
  it('switches gameplay hints, scenery labels and object names live', () => {
    setLocale('sk');
    expect(t('floorTouched')).toBe('DOTYK S PODLAHOU');
    expect(t('exitSign')).toBe('VÝCHOD  →');
    expect(furnitureName('office chair')).toBe('kancelársku stoličku');
    expect(areaNames.map(t)).toContain('Zasadačky');
    expect(t(areaHints[0])).toContain('Medzerníkom');
    setLocale('en');
    expect(furnitureName('office chair')).toBe('office chair');
  });
  it('notifies existing scenes and releases disposed listeners', () => {
    let renders = 0;
    const unsubscribe = onLocaleChange(() => renders++);
    setLocale('sk'); expect(renders).toBe(1);
    unsubscribe(); setLocale('en'); expect(renders).toBe(1);
  });
});

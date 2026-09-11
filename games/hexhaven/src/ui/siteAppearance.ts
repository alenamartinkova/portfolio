import { getLocale, setLocale, type Locale } from '../i18n';

import {
  ACCENT_IDS,
  initializeAppearance,
  isLightTheme,
  readPreference,
  setAppearancePreference,
  siteLinks,
  storePreference,
} from '../../../../shared/appearance.js';

export { ACCENT_IDS as SITE_ACCENTS } from '../../../../shared/appearance.js';
type SiteAccent = (typeof ACCENT_IDS)[number];

export function initializeSiteAppearance(): void {
  setSiteLocale(readPreference('locale', 'en') === 'sk' ? 'sk' : 'en');
  initializeAppearance();
}

export function setSiteLocale(locale: Locale): void {
  setLocale(locale);
  document.documentElement.lang = locale;
  storePreference('locale', locale);
}

export function siteAccent(): SiteAccent {
  return ACCENT_IDS.find((value) => value === document.documentElement.dataset.accent) ?? 'violet';
}

export function setSiteAccent(input: string): void {
  const accent = ACCENT_IDS.find((value) => value === input);
  if (!accent) return;
  setAppearancePreference('accent', accent);
}

export function siteHome(): string {
  return siteLinks(getLocale()).home;
}

export function siteGames(): string {
  return siteLinks(getLocale()).games;
}

export function readSiteAppearance(): {
  background: string;
  surface: string;
  accent: string;
  text: string;
  theme: 'dark' | 'light';
} {
  const tokens = getComputedStyle(document.documentElement);
  return {
    background: tokens.getPropertyValue('--bg').trim(),
    surface: tokens.getPropertyValue('--surface').trim(),
    accent: tokens.getPropertyValue('--accent').trim(),
    text: tokens.getPropertyValue('--text').trim(),
    theme: isLightTheme() ? 'light' : 'dark',
  };
}

import { getLocale, setLocale, type Locale } from '../i18n';

export const SITE_ACCENTS = ['violet', 'cyan', 'lime', 'amber', 'rose', 'blue'] as const;
export type SiteAccent = (typeof SITE_ACCENTS)[number];

function preference(key: string, fallback: string): string {
  const parameter = new URLSearchParams(location.search).get(key === 'locale' ? 'lang' : key);
  if (parameter !== null) return parameter;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function storePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Appearance remains usable for this visit when storage is unavailable.
  }
  const url = new URL(location.href);
  const parameter = key === 'locale' ? 'lang' : key;
  if (url.searchParams.has(parameter)) {
    url.searchParams.set(parameter, value);
    history.replaceState(null, '', url);
  }
}

export function initializeSiteAppearance(): void {
  setLocale(preference('locale', 'en') === 'sk' ? 'sk' : 'en');
  document.documentElement.lang = getLocale();
  storePreference('locale', getLocale());
  document.documentElement.dataset.theme =
    preference('theme', 'dark') === 'light' ? 'light' : 'dark';
  const accent = preference('accent', 'violet');
  document.documentElement.dataset.accent =
    SITE_ACCENTS.find((value) => value === accent) ?? 'violet';
}

export const siteLocale = getLocale;

export function setSiteLocale(locale: Locale): void {
  setLocale(locale);
  document.documentElement.lang = locale;
  storePreference('locale', locale);
}

export function isLightTheme(): boolean {
  return document.documentElement.dataset.theme === 'light';
}

export function siteAccent(): SiteAccent {
  return (
    SITE_ACCENTS.find((value) => value === document.documentElement.dataset.accent) ?? 'violet'
  );
}

export function toggleSiteTheme(): void {
  const theme = isLightTheme() ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  storePreference('theme', theme);
}

export function setSiteAccent(input: string): void {
  const accent = SITE_ACCENTS.find((value) => value === input);
  if (!accent) return;
  document.documentElement.dataset.accent = accent;
  storePreference('accent', accent);
}

export function siteHome(): string {
  return getLocale() === 'sk' ? '/sk/' : '/';
}

export function siteGames(): string {
  return `/games/?lang=${getLocale()}`;
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

export type Locale = 'en' | 'sk';
let locale: Locale = 'en';

/** Presentation preference only: the rules, saved actions and replay stay language-neutral. */
export const getLocale = (): Locale => locale;
export function setLocale(value: Locale): void {
  locale = value;
}
export const localize = (english: string, slovak: string): string =>
  locale === 'sk' ? slovak : english;

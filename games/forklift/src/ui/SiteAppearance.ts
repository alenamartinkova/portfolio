import {
  initializeAppearance,
  readPreference,
  siteLinks as linksForLocale,
} from '../../../../shared/appearance.js';
import { getLocale, setLocale } from '../i18n';

export { isLightTheme } from '../../../../shared/appearance.js';

export function initializeSiteAppearance(): void {
  setLocale(readPreference('locale', 'en') === 'sk' ? 'sk' : 'en');
  initializeAppearance();
}

export function siteLinks() {
  return linksForLocale(getLocale());
}

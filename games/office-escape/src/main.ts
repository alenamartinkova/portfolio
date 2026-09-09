import { desktopGame } from '../../../shared/desktop-game.js';
import { getLocale } from './i18n';
import { initializeSiteAppearance } from './ui/SiteAppearance';

initializeSiteAppearance();
const dispose = desktopGame({
  title: 'Office Escape',
  locale: getLocale(),
  load: () => import('./start'),
});
if (import.meta.hot) import.meta.hot.dispose(dispose);

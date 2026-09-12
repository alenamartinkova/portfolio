import { loadGame } from '../../../shared/load-game.js';
import { getLocale } from './i18n';
import { initializeSiteAppearance } from './ui/SiteAppearance';

initializeSiteAppearance();
const dispose = loadGame({
  title: 'Office Escape',
  locale: getLocale(),
  load: () => import('./start').then(module => module.start()),
});
if (import.meta.hot) import.meta.hot.dispose(dispose);

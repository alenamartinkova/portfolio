import { loadGame } from '../../../shared/load-game.js';
import { getLocale } from './i18n';
import { initializeSiteAppearance } from './ui/SiteAppearance';

initializeSiteAppearance();
const dispose = loadGame({
  title: 'Forklift Certified',
  locale: getLocale(),
  load: (signal: AbortSignal) => import('./start').then(module => module.start(signal)),
});
if (import.meta.hot) import.meta.hot.dispose(dispose);

import './appearance.css';
import './shell.css';
import { loadGame } from '../../../../shared/load-game.js';
import { initializeSiteAppearance } from '../ui/siteAppearance';
initializeSiteAppearance();
const dispose = loadGame({
  title: 'Hexhaven', locale: document.documentElement.lang,
  load: () => import('./controller').then(({ startApplication }) => startApplication(document.querySelector<HTMLDivElement>('#app')!)),
});
if (import.meta.hot) import.meta.hot.dispose(dispose);

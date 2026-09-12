import { loadGame } from '../../../shared/load-game.js';
import { initializeAppearance, readPreference } from '../../../shared/appearance.js';
initializeAppearance();
const dispose = loadGame({
  title: 'Cable Management', locale: readPreference('locale', 'en'),
  load: () => import('./application').then(module => module.start()),
});
if (import.meta.hot) import.meta.hot.dispose(dispose);

import './appearance.css';
import './shell.css';
import { startApplication } from './controller';
import { initializeSiteAppearance } from '../ui/siteAppearance';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('The game mount is missing. Reload the page.');
initializeSiteAppearance();
await Promise.all([
  document.fonts.load('600 20px "Space Grotesk"', 'Drevo Obilie Vlna Tehla Ruda Ľubovoľná'),
  document.fonts.load('500 14px "JetBrains Mono"', 'Drevo Obilie Vlna Tehla Ruda Ľubovoľná'),
]);
const dispose = startApplication(app);
if (import.meta.hot) import.meta.hot.dispose(dispose);

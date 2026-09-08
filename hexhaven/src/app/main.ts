import '@fontsource-variable/fraunces';
import '@fontsource-variable/public-sans';
import './shell.css';
import { startApplication } from './controller';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('The game mount is missing. Reload the page.');
await Promise.all([
  document.fonts.load('600 20px "Fraunces Variable"'),
  document.fonts.load('500 14px "Public Sans Variable"'),
]);
const dispose = startApplication(app);
if (import.meta.hot) import.meta.hot.dispose(dispose);

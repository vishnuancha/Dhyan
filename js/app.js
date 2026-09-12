import { startRouter } from './router.js';
import { startReminders } from './screens/settings.js';

const view = document.getElementById('view');
startRouter(view);
startReminders();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is optional */
    });
  });
}

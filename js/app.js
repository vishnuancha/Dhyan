import { startRouter } from './router.js';
import { startReminders } from './screens/settings.js';
import { trackKeyboard } from './core/viewport.js';

const view = document.getElementById('view');
startRouter(view);
startReminders();
trackKeyboard();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is optional */
    });
  });
}

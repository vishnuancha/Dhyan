// Hash router + tab shell, mirroring navigation/AppNavHost.kt.

import { h, clear } from './core/ui.js';
import { icon } from './core/icons.js';
import { homeScreen } from './screens/home.js';
import { focusScreen } from './screens/focus.js';
import { meditationScreen } from './screens/meditation.js';
import { habitsScreen } from './screens/habits.js';
import { progressScreen } from './screens/progress.js';
import { settingsScreen } from './screens/settings.js';
import { memoryScreen } from './games/memory.js';
import { stroopScreen } from './games/stroop.js';
import { mathScreen } from './games/math.js';
import { sequenceScreen } from './games/sequence.js';
import { sudokuScreen } from './games/sudoku.js';
import { zipScreen } from './games/zip/zip.js';

const TABS = [
  { path: '', label: 'Games', icon: 'games', brush: 'games' },
  { path: 'focus', label: 'Meditate', icon: 'meditate', brush: 'meditate' },
  { path: 'habits', label: 'Habits', icon: 'habits', brush: 'habits' },
  { path: 'progress', label: 'Stats', icon: 'stats', brush: 'stats' },
  { path: 'settings', label: 'Settings', icon: 'settings', brush: 'settings' },
];

const routes = [
  { pattern: [], render: () => homeScreen() },
  { pattern: ['focus'], render: () => focusScreen() },
  { pattern: ['meditation', ':id'], immersive: true, render: (p) => meditationScreen(p.id) },
  { pattern: ['habits'], render: () => habitsScreen() },
  { pattern: ['progress'], render: () => progressScreen() },
  { pattern: ['settings'], render: () => settingsScreen() },
  { pattern: ['games', 'memory'], immersive: true, render: () => memoryScreen() },
  { pattern: ['games', 'stroop'], immersive: true, render: () => stroopScreen() },
  { pattern: ['games', 'math'], immersive: true, render: () => mathScreen() },
  { pattern: ['games', 'sequence'], immersive: true, render: () => sequenceScreen() },
  { pattern: ['games', 'sudoku'], immersive: true, render: () => sudokuScreen() },
  { pattern: ['games', 'zip'], immersive: true, render: () => zipScreen() },
];

let viewEl = null;
let currentCleanup = null;

export function currentPath() {
  return decodeURIComponent(window.location.hash.replace(/^#\/?/, '')).replace(/\/$/, '');
}

export function navigate(path) {
  const next = `#/${path}`;
  if (window.location.hash === next) {
    render();
    return;
  }
  window.location.hash = next;
}

export function back() {
  if (window.history.length > 1) window.history.back();
  else navigate('');
}

function match(path) {
  const parts = path ? path.split('/') : [];
  for (const route of routes) {
    if (route.pattern.length !== parts.length) continue;
    const params = {};
    const ok = route.pattern.every((segment, i) => {
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = parts[i];
        return true;
      }
      return segment === parts[i];
    });
    if (ok) return { route, params };
  }
  return null;
}

function renderNav(activePath) {
  const nav = document.getElementById('nav');
  if (!nav) return;
  clear(nav);
  for (const tab of TABS) {
    const active = tab.path === activePath;
    nav.appendChild(
      h(
        'button',
        {
          class: 'nav__item',
          type: 'button',
          'aria-current': active ? 'page' : null,
          onclick: () => navigate(tab.path),
        },
        icon(tab.icon),
        h('span', {}, tab.label),
      ),
    );
  }
}

function render() {
  const path = currentPath();
  const found = match(path);

  if (currentCleanup) {
    try {
      currentCleanup();
    } catch {
      /* ignore */
    }
    currentCleanup = null;
  }

  clear(viewEl);
  document.body.classList.toggle('immersive', Boolean(found?.route.immersive));

  if (!found) {
    renderNav(null);
    viewEl.appendChild(notFound(path));
    return;
  }

  renderNav(found.route.immersive ? null : path);
  const result = found.route.render(found.params);
  const node = result instanceof Node ? result : result.el;
  currentCleanup = result instanceof Node ? result.__cleanup || null : result.cleanup || null;
  viewEl.appendChild(node);
  viewEl.scrollTop = 0;
  window.scrollTo(0, 0);
}

function notFound(path) {
  return h(
    'div',
    { class: 'tab-screen' },
    h('h1', {}, 'Page not found'),
    h('p', { class: 'caption' }, `Nothing lives at “${path}”.`),
    h('button', { class: 'btn', type: 'button', onclick: () => navigate('') }, 'Back to games'),
  );
}

export function startRouter(view) {
  viewEl = view;
  window.addEventListener('hashchange', render);
  if (!window.location.hash) window.location.hash = '#/';
  render();
}

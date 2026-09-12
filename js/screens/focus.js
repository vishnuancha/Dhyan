// Meditate tab — port of features/focus/FocusScreen.kt.

import { emptyState, h, tabScreen } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { SESSIONS } from '../data/meditation.js';
import { navigate } from '../router.js';

export function focusScreen() {
  const list = h('div', { class: 'card' });

  if (!SESSIONS.length) {
    list.appendChild(
      emptyState({
        icon: 'meditate',
        title: 'No sessions yet',
        body: 'Guided sessions will appear here once they are bundled.',
        accent: 'var(--teal)',
      }),
    );
  } else {
    for (const session of SESSIONS) {
      list.appendChild(
        h(
          'button',
          {
            class: 'session-card',
            type: 'button',
            style: { '--accent': session.accent },
            'aria-label': `${session.title}, ${session.minutes} minutes. ${session.subtitle}`,
            onclick: () => navigate(`meditation/${session.id}`),
          },
          h('span', { class: 'session-card__icon' }, icon(session.icon)),
          h(
            'span',
            { class: 'session-card__text' },
            h('strong', {}, session.title),
            h('span', {}, session.subtitle),
          ),
          h('span', { class: 'chip chip--accent', style: { '--accent': session.accent } }, `${session.minutes} min`),
        ),
      );
    }
  }

  return tabScreen(
    {
      title: 'Meditate',
      subtitle: 'Guided breathing and mindfulness sessions. Completed minutes count toward your day.',
      brush: 'meditate',
    },
    h('h2', { class: 'section-title' }, 'Guided meditations'),
    h('p', { class: 'caption' }, 'Guided audio sessions with a breathing circle. Headphones recommended.'),
    h('hr', { class: 'divider' }),
    list,
  );
}

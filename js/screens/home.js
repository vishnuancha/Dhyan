// Home / Games tab — port of features/home/HomeScreen.kt.

import { h, tabScreen, button } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { GAMES } from '../games/meta.js';
import { navigate } from '../router.js';
import { activeDates, bestPerGame, dailyFor, prefs, totalXp } from '../state/store.js';
import { streakCount, todayString } from '../core/dates.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour <= 11) return 'Good morning';
  if (hour <= 16) return 'Good afternoon';
  return 'Good evening';
}

function gameCard(game, best) {
  const meta = best > 0 ? `Best ${best}` : 'New';
  return h(
    'button',
    {
      class: 'game-card',
      type: 'button',
      style: { '--accent': game.accent },
      'aria-label': `${game.title}. ${game.blurb}. ${meta}`,
      onclick: () => navigate(game.path),
    },
    h('span', { class: 'game-card__icon' }, icon(game.icon)),
    h(
      'span',
      { class: 'game-card__text' },
      h('strong', {}, game.title),
      h('span', {}, game.blurb),
    ),
    h('span', { class: 'game-card__meta' }, meta),
    icon('chevron'),
  );
}

export function homeScreen() {
  const bests = new Map(bestPerGame().map((b) => [b.gameType, b.best]));
  const todayStat = dailyFor(todayString()) || { gamesPlayed: 0, focusMinutes: 0 };
  const xp = totalXp();
  const streak = streakCount(activeDates());
  const name = (prefs().userName || '').trim();

  const hero = h(
    'div',
    { class: 'hero' },
    h('div', { class: 'hero__streak' }, streak > 0 ? `${streak} day streak` : '— day streak'),
    h('div', { class: 'hero__xp' }, `${xp} total XP`),
    h(
      'div',
      { class: 'hero__chips' },
      h('span', { class: 'hero__chip' }, `${todayStat.gamesPlayed} games today`),
      h('span', { class: 'hero__chip' }, `${todayStat.focusMinutes} min focus`),
    ),
  );

  const training = h(
    'div',
    { class: 'card' },
    h('h2', { class: 'card__title' }, "Today's training"),
    h(
      'p',
      { class: 'card__note' },
      todayStat.gamesPlayed === 0
        ? 'Play one game and log one habit — 5 minutes is enough to start.'
        : 'Nice work! One more session or a focus round keeps the streak going.',
    ),
    h(
      'div',
      { class: 'card__row' },
      button({ label: 'Play', onClick: () => navigate('games/memory') }),
      button({ label: 'Meditate', variant: 'outlined', onClick: () => navigate('focus') }),
      button({ label: 'Habits', variant: 'outlined', onClick: () => navigate('habits') }),
    ),
  );

  return tabScreen(
    { title: name ? `${greeting()}, ${name}` : `${greeting()}!`, brush: 'games' },
    hero,
    training,
    h('h2', { class: 'section-title' }, 'Games'),
    h(
      'div',
      { class: 'game-grid' },
      ...GAMES.map((game) => gameCard(game, bests.get(game.type) || 0)),
    ),
  );
}

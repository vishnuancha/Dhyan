// Stats tab — port of features/progress/ProgressScreen.kt.

import { emptyState, h, statCard, tabScreen } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { gameByType } from '../games/meta.js';
import { longDate, streakCount, weekdayLetter } from '../core/dates.js';
import { activeDates, bestPerGame, dailyRecent, recentResults, totalXp } from '../state/store.js';

const RECENT_SHOWN = 10;

export function progressScreen() {
  const xp = totalXp();
  const streak = streakCount(activeDates());
  const recent = recentResults(50);
  const shown = recent.slice(0, RECENT_SHOWN);
  const bests = bestPerGame();
  const week = dailyRecent(30).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const maxXp = Math.max(...week.map((day) => day.xp + day.habitXp), 1);

  const statRow = h(
    'div',
    { class: 'stat-grid' },
    statCard({ title: 'Total XP', value: String(xp), accent: 'var(--violet)' }),
    statCard({ title: 'Streak', value: `${streak} d`, accent: 'var(--amber)' }),
    statCard({
      title: 'Sessions',
      value: recent.length > shown.length ? `${shown.length}+` : String(shown.length),
      accent: 'var(--teal)',
    }),
  );

  const bestsCard = h(
    'div',
    { class: 'card' },
    h('h2', { class: 'card__title' }, 'Personal bests'),
    bests.length
      ? h(
          'div',
          {},
          ...bests.map((entry) => {
            const game = gameByType(entry.gameType);
            return h(
              'div',
              { class: 'list-row' },
              h('span', { class: 'dot', style: { background: game.accent } }),
              h('span', {}, game.title),
              h('span', { class: 'list-row__value', style: { color: game.accent } }, `${entry.best} pts`),
            );
          }),
        )
      : emptyState({
          icon: 'trophy',
          title: 'No bests yet',
          body: 'Play any game to set your first best.',
          accent: 'var(--amber)',
        }),
  );

  const weekCard = h(
    'div',
    { class: 'card' },
    h('h2', { class: 'card__title' }, 'Last 7 days'),
    week.length
      ? weekChart(week, maxXp)
      : emptyState({
          icon: 'play',
          title: 'No activity yet',
          body: 'Play a game or finish a meditation to start your chart.',
          accent: 'var(--violet)',
        }),
  );

  const recentCard = h(
    'div',
    { class: 'card' },
    h('h2', { class: 'card__title' }, 'Recent sessions'),
    shown.length
      ? h(
          'div',
          {},
          ...shown.map((entry) => {
            const game = gameByType(entry.gameType);
            return h(
              'div',
              {
                class: 'list-row',
                'aria-label': `${game.title}, score ${entry.score}, accuracy ${Math.trunc(entry.accuracy * 100)} percent, plus ${entry.xp} XP`,
              },
              h('span', { class: 'dot', style: { background: game.accent } }),
              h(
                'span',
                {},
                h('strong', {}, game.title),
                h('br'),
                h('span', { class: 'caption' }, `${entry.score} pts · ${Math.trunc(entry.accuracy * 100)}% · +${entry.xp} XP`),
              ),
              icon('chevron'),
            );
          }),
        )
      : h('p', { class: 'caption' }, 'No sessions yet.'),
    recent.length > shown.length
      ? h('p', { class: 'caption' }, `${recent.length - shown.length} older sessions not shown.`)
      : null,
  );

  return tabScreen(
    { title: 'Stats', subtitle: 'XP, streaks and your recent training.', brush: 'stats' },
    statRow,
    h('div', { class: 'two-up' }, bestsCard, weekCard),
    recentCard,
  );
}

function weekChart(week, maxXp) {
  const chart = h('div', { class: 'bars' });

  for (const day of week) {
    const total = day.xp + day.habitXp;
    const fraction = Math.min(Math.max(total / maxXp, 0.04), 1);
    chart.appendChild(
      h(
        'div',
        {
          class: 'bar',
          'aria-label': `${longDate(day.date)}: ${day.gamesPlayed} games, ${total} XP`,
        },
        h('span', { class: 'bar__value' }, String(total)),
        h('div', { class: 'bar__track' }, h('div', { class: 'bar__fill', style: { height: `${116 * fraction}px` } })),
        h('span', { class: 'bar__label' }, weekdayLetter(day.date)),
      ),
    );
  }

  return chart;
}

// Habits tab — port of features/habits/HabitsScreen.kt + HabitsViewModel.kt.

import { append, button, clear, h, progressBar, tabScreen } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { HabitGoals, habitXpDetailed } from '../core/scoring.js';
import { todayString } from '../core/dates.js';
import { habitFor, saveHabit } from '../state/store.js';

const FIELDS = [
  { key: 'sleepHours', name: 'Sleep', accent: 'var(--indigo)', step: 0.5, min: 0, max: 24, goal: `Goal: ${HabitGoals.SLEEP_HOURS}h+`, format: (v) => `${formatSleep(v)}h` },
  { key: 'exerciseMin', name: 'Exercise', accent: 'var(--green)', step: 5, min: 0, max: 300, goal: `Goal: ${HabitGoals.EXERCISE_MIN} min`, format: (v) => `${v} min` },
  { key: 'waterGlasses', name: 'Water', accent: 'var(--blue)', step: 1, min: 0, max: 20, goal: `Goal: ${HabitGoals.WATER_GLASSES} glasses`, format: (v) => `${v}` },
  { key: 'readingMin', name: 'Reading', accent: 'var(--amber)', step: 5, min: 0, max: 300, goal: `Goal: ${HabitGoals.READING_MIN} min`, format: (v) => `${v} min` },
  { key: 'meditationMin', name: 'Meditation', accent: 'var(--teal)', step: 5, min: 0, max: 120, goal: `Goal: ${HabitGoals.MEDITATION_MIN} min`, format: (v) => `${v} min` },
];

const DEFAULTS = { sleepHours: 7, exerciseMin: 20, waterGlasses: 6, readingMin: 10, meditationMin: 5 };

function formatSleep(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function onTarget(field, value) {
  if (field.key === 'sleepHours') return value >= HabitGoals.SLEEP_HOURS;
  if (field.key === 'exerciseMin') return value >= HabitGoals.EXERCISE_MIN;
  if (field.key === 'waterGlasses') return value >= HabitGoals.WATER_GLASSES;
  if (field.key === 'readingMin') return value >= HabitGoals.READING_MIN;
  return value >= HabitGoals.MEDITATION_MIN;
}

export function habitsScreen() {
  const today = todayString();
  const saved = habitFor(today);
  const draft = saved
    ? { ...DEFAULTS, ...saved }
    : { ...DEFAULTS };

  let savedTick = 0;
  const list = h('div', { class: 'card' });

  function isDirty() {
    if (!saved) return true;
    return FIELDS.some((field) => draft[field.key] !== saved[field.key]);
  }

  function clamp(field, value) {
    const bounded = Math.min(Math.max(value, field.min), field.max);
    return field.key === 'sleepHours' ? Math.round(bounded * 2) / 2 : Math.round(bounded);
  }

  function renderList() {
    clear(list);
    for (const field of FIELDS) {
      const value = draft[field.key];
      const met = onTarget(field, value);
      list.appendChild(
        h(
          'div',
          {
            class: 'card',
            style: met ? { '--accent': field.accent, background: `color-mix(in srgb, ${field.accent} 14%, var(--surface-variant))` } : {},
          },
          h(
            'div',
            { class: 'habit-head' },
            h('strong', {}, field.name),
            met ? icon('check') : null,
          ),
          h('p', { class: 'caption' }, field.goal),
          h(
            'div',
            { class: 'stepper' },
            h(
              'button',
              {
                class: 'stepper__btn',
                type: 'button',
                'aria-label': `Decrease ${field.name}`,
                onclick: () => {
                  draft[field.key] = clamp(field, draft[field.key] - field.step);
                  refresh();
                },
              },
              '−',
            ),
            h('span', { class: 'stepper__value', 'aria-label': `${field.name} ${field.format(value)}` }, field.format(value)),
            h(
              'button',
              {
                class: 'stepper__btn',
                type: 'button',
                'aria-label': `Increase ${field.name}`,
                onclick: () => {
                  draft[field.key] = clamp(field, draft[field.key] + field.step);
                  refresh();
                },
              },
              '+',
            ),
          ),
        ),
      );
    }
  }

  function xpCard() {
    const xp = habitXpDetailed(draft);
    return h(
      'div',
      { class: 'card' },
      h('h2', { class: 'card__title' }, 'XP earned'),
      h('div', { style: { 'font-size': '32px', 'font-weight': '700', color: 'var(--violet)' } }, `+${xp.xp} XP`),
      h(
        'div',
        { class: 'xp-lines' },
        h(
          'div',
          {},
          h('span', { class: 'dot', style: { background: 'var(--teal)' } }),
          `${xp.loggedCount} habits logged`,
          h('span', { class: 'value' }, `+${xp.loggedCount * 5}`),
        ),
        h(
          'div',
          {},
          h('span', { class: 'dot', style: { background: 'var(--violet)' } }),
          `${xp.goalsMet} goals met`,
          h('span', { class: 'value' }, `+${xp.goalsMet * 15}`),
        ),
      ),
      xp.capped ? h('p', { class: 'caption' }, 'Daily habit XP cap reached (100)') : null,
      h('p', { class: 'caption' }, 'Games and focus sessions add separate XP.'),
      savedTick > 0 ? h('p', { class: 'feedback feedback--ok' }, "Saved — XP added to today's total.") : null,
    );
  }

  function progressCard() {
    const met = FIELDS.filter((field) => onTarget(field, draft[field.key])).length;
    return h(
      'div',
      { class: 'card' },
      h('h2', { class: 'card__title' }, 'Progress'),
      h('p', { class: 'caption' }, `${met} of ${HabitGoals.HABIT_COUNT} on target`),
      progressBar({ value: met, total: HabitGoals.HABIT_COUNT, accent: 'var(--teal)' }),
    );
  }

  /* ---------- shell with sticky save bar ---------- */

  const saveBar = h('div', { class: 'save-bar' });
  const saveButton = button({
    label: saved ? 'Update today' : 'Save today',
    block: true,
    large: true,
    disabled: !isDirty(),
    onClick: () => {
      saveHabit(today, draft);
      savedTick += 1;
      refresh();
      saveButton.disabled = true;
    },
  });
  saveBar.appendChild(saveButton);

  function refresh() {
    renderList();
    clear(shell);
    append(shell, tabScreen(
      { title: "Today's habits", subtitle: 'Log what you did today. Goals earn bonus XP.', brush: 'habits' },
      progressCard(),
      list,
      xpCard(),
    ));
    saveButton.disabled = !isDirty();
  }

  const shell = h('div');
  refresh();

  const root = h('div', {}, shell, saveBar);
  root.__cleanup = () => saveBar.remove();
  return root;
}

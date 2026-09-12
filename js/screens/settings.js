// Settings tab — port of features/settings/SettingsScreen.kt + SettingsViewModel.kt.
// The reminder is best-effort: browsers cannot wake a closed page, so it fires while
// the app is open (or installed and running).

import { button, h, tabScreen } from '../core/ui.js';
import { prefs, updatePrefs } from '../state/store.js';
import { todayString } from '../core/dates.js';

function timeLabel(hour, minute) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function switchRow(label, checked, onChange) {
  const input = h('input', { type: 'checkbox', checked: checked || false, onchange: (event) => onChange(event.target.checked) });
  return h(
    'div',
    { class: 'switch-row' },
    h('span', {}, label),
    h('label', { class: 'switch' }, input, h('span', { class: 'switch__track' }), h('span', { class: 'switch__thumb' })),
  );
}

export function settingsScreen() {
  const current = prefs();
  let name = current.userName;

  const nameInput = h('input', {
    class: 'field',
    type: 'text',
    value: current.userName,
    'aria-label': 'Name (on this device only)',
    placeholder: 'Your name',
    oninput: (event) => {
      name = event.target.value;
      saveName.disabled = name === current.userName;
    },
  });

  const saveName = button({
    label: 'Save',
    block: true,
    disabled: true,
    onClick: () => {
      updatePrefs({ userName: name.trim() });
      saveName.disabled = true;
    },
  });

  function reminderRow() {
    const state = prefs();
    return h(
      'div',
      {},
      switchRow(`Daily reminder · ${state.reminderEnabled ? timeLabel(state.reminderHour, state.reminderMinute) : 'Off'}`, state.reminderEnabled, async (on) => {
        if (on && 'Notification' in window) {
          try {
            await Notification.requestPermission();
          } catch {
            /* denied or unavailable */
          }
        }
        updatePrefs({ reminderEnabled: on });
        rerender();
      }),
      state.reminderEnabled
        ? h(
            'div',
            { class: 'card' },
            h('label', { class: 'caption', for: 'reminder-time' }, 'Reminder time'),
            h('input', {
              class: 'field',
              id: 'reminder-time',
              type: 'time',
              value: `${String(state.reminderHour).padStart(2, '0')}:${String(state.reminderMinute).padStart(2, '0')}`,
              onchange: (event) => {
                const [hour, minute] = event.target.value.split(':').map(Number);
                updatePrefs({ reminderHour: hour, reminderMinute: minute });
                rerender();
              },
            }),
            h(
              'p',
              { class: 'caption' },
              'Reminders only appear while Dhyan is open in a tab or installed and running — browsers cannot wake a closed page.',
            ),
          )
        : null,
    );
  }

  const body = h('div');

  function rerender() {
    const state = prefs();
    body.replaceChildren(
      h(
        'div',
        { class: 'card' },
        h('h2', { class: 'card__title' }, 'Profile'),
        h('label', { class: 'caption', for: 'name-input' }, 'Name (on this device only)'),
        nameInput,
        saveName,
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', { class: 'card__title' }, 'Daily reminder'),
        reminderRow(),
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', { class: 'card__title' }, 'Feedback'),
        switchRow('Sound', state.soundOn, (on) => {
          updatePrefs({ soundOn: on });
          rerender();
        }),
        switchRow('Haptics', state.hapticsOn, (on) => {
          updatePrefs({ hapticsOn: on });
          rerender();
        }),
      ),
      h('p', { class: 'disclaimer' }, 'Dhyan is for general wellness and entertainment. It is not a medical device.'),
    );
  }

  rerender();

  const screen = tabScreen({ title: 'Settings', brush: 'settings' }, body);
  nameInput.id = 'name-input';
  return screen;
}

let reminderTimer = null;

export function startReminders() {
  if (reminderTimer) return;
  let lastFired = '';

  reminderTimer = setInterval(() => {
    const state = prefs();
    if (!state.reminderEnabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const target = state.reminderHour * 60 + state.reminderMinute;
    const today = todayString();
    if (minutesNow < target || lastFired === today) return;

    lastFired = today;
    try {
      new Notification('Dhyan', { body: 'Time for a quick session — a game or a few mindful minutes.' });
    } catch {
      /* notification failed — nothing else to do */
    }
  }, 30000);
}

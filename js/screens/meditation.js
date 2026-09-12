// Meditation player — port of features/focus/MeditationPlayerScreen.kt (state lives in
// FocusViewModel, audio in MeditationAudio).

import { append, button, clear, gameScreen, h, progressBar } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { nextStepIndex, sessionById, stepsOf, totalSeconds } from '../data/meditation.js';
import { addFocusMinutes, addMeditationMinutes, prefs, updatePrefs } from '../state/store.js';
import { back } from '../router.js';

const LENGTHS = [3, 5, 10];

export function meditationScreen(id) {
  const session = sessionById(id);
  if (!session) {
    return h(
      'div',
      { class: 'screen' },
      h(
        'div',
        { class: 'screen__body' },
        h('p', {}, 'That session no longer exists.'),
        button({ label: 'Back to Meditate', block: true, onClick: () => back('focus') }),
      ),
    );
  }

  const steps = stepsOf(session);
  let view = 'intro';
  let chosenMinutes = session.minutes;
  let stepIndex = 0;
  let secondsLeftInStep = steps.length ? steps[0].seconds : 0;
  let totalSecondsLeft = 0;
  let totalSecondsValue = 0;
  let paused = false;
  let loggedMinutes = 0;
  let ticker = null;

  let audioOn = prefs().audioOn && Boolean(session.audio);
  const audio = session.audio ? new Audio(session.audio) : null;
  if (audio) {
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = audioOn ? 1 : 0;
  }

  const body = h('div');
  const root = gameScreen(
    { title: session.title, accent: session.accent, onBack: () => exit(), style: { '--accent': session.accent } },
    body,
  );

  root.__cleanup = () => {
    stopTicker();
    stopAudio();
  };

  function stopTicker() {
    if (ticker) clearInterval(ticker);
    ticker = null;
  }

  function stopAudio() {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  function exit() {
    endSession();
  }

  function draw() {
    clear(body);
    if (view === 'intro') append(body, introView());
    else if (view === 'playing') append(body, playingView());
    else append(body, finishedView());
  }

  /* ---------- intro ---------- */

  function introView() {
    const lengthPicker = session.loop
      ? h(
          'div',
          { class: 'card' },
          h('p', { class: 'caption' }, 'Length'),
          h(
            'div',
            { class: 'card__row' },
            ...LENGTHS.map((minutes) =>
              button({
                label: `${minutes} min`,
                variant: minutes === chosenMinutes ? 'filled' : 'outlined',
                flex: true,
                onClick: () => {
                  chosenMinutes = minutes;
                  draw();
                },
              }),
            ),
          ),
        )
      : h(
          'p',
          { class: 'caption' },
          `${session.minutes} min · ${session.audio ? 'guided audio (repeats to fill the session)' : 'narrated script'}`,
        );

    return h(
      'div',
      { class: 'card player' },
      h(
        'div',
        {
          class: 'session-card__icon',
          style: { width: '96px', height: '96px', 'border-radius': '50%', '--accent': session.accent },
        },
        icon(session.icon),
      ),
      h('h2', { style: { 'font-size': '26px' } }, session.title),
      h('p', { class: 'caption', style: { 'text-align': 'center' } }, session.subtitle),
      lengthPicker,
      button({ label: 'Begin session', block: true, large: true, onClick: startSession }),
      h(
        'p',
        { class: 'caption' },
        "The session's guided audio plays for the whole timer, repeating if it is shorter than the length you picked. On-screen cues, an animated breathing circle and gentle vibrations guide you too. Mute the audio any time if you prefer a silent session.",
      ),
    );
  }

  /* ---------- playback ---------- */

  function startSession() {
    if (!steps.length) return;
    totalSecondsValue = totalSeconds(session, chosenMinutes);
    totalSecondsLeft = totalSecondsValue;
    stepIndex = 0;
    secondsLeftInStep = steps[0].seconds;
    paused = false;
    view = 'playing';
    draw();

    if (audio && audioOn) {
      audio.volume = 1;
      audio.play().catch(() => {
        /* autoplay blocked — the session still runs silently */
      });
    }

    stopTicker();
    ticker = setInterval(tick, 1000);
  }

  function tick() {
    if (view !== 'playing' || paused) return;

    if (secondsLeftInStep - 1 > 0) {
      secondsLeftInStep -= 1;
      totalSecondsLeft -= 1;
      updateHud();
      return;
    }

    const next = nextStepIndex(session, stepIndex, totalSecondsLeft - 1);
    if (next === null) {
      completeSession();
      return;
    }
    stepIndex = next;
    secondsLeftInStep = steps[next].seconds;
    totalSecondsLeft -= 1;
    applyBreath();
    updateHud();
  }

  function completeSession() {
    stopTicker();
    stopAudio();
    logSession(Math.floor((totalSecondsValue + 30) / 60));
  }

  function endSession() {
    stopTicker();
    stopAudio();
    if (view !== 'playing') {
      back('focus');
      return;
    }
    const elapsed = totalSecondsValue - totalSecondsLeft;
    const minutes = Math.floor((elapsed + 59) / 60);
    if (minutes <= 0) {
      back('focus');
      return;
    }
    logSession(minutes);
  }

  function logSession(minutes) {
    loggedMinutes = minutes;
    addFocusMinutes(minutes);
    addMeditationMinutes(minutes);
    view = 'finished';
    draw();
  }

  function togglePause() {
    paused = !paused;
    if (audio) {
      if (paused) audio.pause();
      else if (audioOn) audio.play().catch(() => {});
    }
    updateHud();
  }

  function toggleAudio() {
    audioOn = !audioOn;
    updatePrefs({ audioOn });
    if (audio) {
      audio.volume = audioOn ? 1 : 0;
      if (audioOn && !paused) audio.play().catch(() => {});
    }
    draw();
  }

  /* ---------- playing view ---------- */

  let timeEl = null;
  let countEl = null;
  let stepEl = null;
  let breathInner = null;
  let progressFill = null;

  function playingView() {
    breathInner = h('div', { class: 'breath__inner' }, h('div', { class: 'breath__ring breath__ring--soft' }), h('div', { class: 'breath__ring breath__ring--mid' }));
    timeEl = h('div', { class: 'player__time' }, clockText());
    countEl = h('div', { class: 'player__count' }, paused ? 'Paused' : `${secondsLeftInStep}s`);
    stepEl = h('div', { class: 'player__step' }, steps[stepIndex].text);

    const bar = progressBar({ value: totalSecondsLeft, total: totalSecondsValue, accent: session.accent });
    progressFill = bar.querySelector('.progress__bar');

    const controls = h(
      'div',
      { class: 'card__row' },
      button({ label: paused ? 'Resume' : 'Pause', flex: true, onClick: togglePause }),
      button({ label: 'End', variant: 'outlined', flex: true, onClick: () => endSession() }),
    );

    const audioToggle = session.audio
      ? h(
          'div',
          { class: 'player__audio' },
          h(
            'button',
            {
              class: 'icon-btn',
              type: 'button',
              style: { '--accent': session.accent },
              'aria-label': audioOn ? 'Mute guided audio' : 'Play guided audio',
              onclick: toggleAudio,
            },
            icon(audioOn ? 'music' : 'musicOff'),
          ),
          audioOn ? 'Audio on' : 'Audio off',
        )
      : null;

    requestAnimationFrame(() => applyBreath());

    return h(
      'div',
      { class: 'card player' },
      bar,
      timeEl,
      h('div', { class: 'breath' }, breathInner),
      stepEl,
      countEl,
      audioToggle,
      controls,
    );
  }

  function clockText() {
    const minutes = Math.floor(totalSecondsLeft / 60);
    const seconds = totalSecondsLeft % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} left`;
  }

  function updateHud() {
    if (!timeEl) return;
    timeEl.textContent = clockText();
    countEl.textContent = paused ? 'Paused' : `${secondsLeftInStep}s`;
    stepEl.textContent = steps[stepIndex].text;
    if (progressFill) {
      const pct = (1 - totalSecondsLeft / Math.max(totalSecondsValue, 1)) * 100;
      progressFill.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
    }
  }

  function applyBreath() {
    if (!breathInner) return;
    const step = steps[stepIndex];
    const target = step.phase === 'INHALE' || step.phase === 'HOLD' ? 1.35 : step.phase === 'EXHALE' ? 1 : 1.1;
    const duration = step.phase === 'HOLD' ? 300 : Math.max(step.seconds * 1000, 600);
    breathInner.style.transitionDuration = `${duration}ms`;
    breathInner.style.transform = `scale(${target})`;
  }

  function finishedView() {
    return h(
      'div',
      { class: 'card player', style: { '--accent': session.accent } },
      h('h2', { style: { 'font-size': '26px' } }, 'Well done'),
      h('p', { class: 'caption', style: { 'text-align': 'center' } }, `${loggedMinutes} min logged to focus and your meditation habit.`),
      button({ label: 'Done', block: true, large: true, onClick: () => back('focus') }),
    );
  }

  draw();
  return root;
}

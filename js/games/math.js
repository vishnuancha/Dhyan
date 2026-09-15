// Math Sprint — port of features/games/math/MathViewModel.kt + MathSprintScreen.kt.
//
// The play view is built once and updated in place. Rebuilding it per tick would
// detach the answer field, which closes the mobile keyboard on every second.

import {
  append,
  boardSize,
  button,
  clear,
  gameResultCard,
  gameScreen,
  gameScaffold,
  h,
  progressBar,
} from '../core/ui.js';
import { feedback } from '../core/feedback.js';
import { clampLevel, levelName, mathFor, tierFor } from '../core/difficulty.js';
import { nextMathProblem } from '../core/math-problems.js';
import { dayIndexFor, gameDifficultyFor, saveResult, setGameDifficulty } from '../state/store.js';
import { back } from '../router.js';

/** Tapping these must not move focus off the answer field, or the keyboard closes. */
function holdFocus(node) {
  node.addEventListener('mousedown', (event) => event.preventDefault());
  return node;
}

function levelBrief(level) {
  switch (clampLevel(level)) {
    case 1:
      return 'Two-digit + and −, times tables up to 12 × 12, and exact division.';
    case 2:
      return 'Three-digit + and −, 2-digit × 1-digit, exact division, and order of operations (a + b × c).';
    default:
      return 'Large numbers, 2-digit × 2-digit, percentages, squares and square roots.';
  }
}

export function mathScreen() {
  const day = dayIndexFor('MATH');
  let level = clampLevel(gameDifficultyFor('MATH') ?? tierFor(day));
  const params = () => mathFor(level);

  let phase = 'intro';
  let question = '';
  let expected = 0;
  let secondsLeft = params().totalSeconds;
  let correct = 0;
  let attempted = 0;
  let message = '';
  let startedAt = 0;
  let save = null;
  let ticker = null;

  let statusEl = null;
  let questionEl = null;
  let feedbackEl = null;
  let progressFill = null;

  const body = h('div');
  const root = gameScreen({ title: 'Math Sprint', accent: 'var(--game-math)', onBack: () => back('') }, body);

  const input = h('input', {
    class: 'field',
    type: 'text',
    inputmode: 'numeric',
    enterkeyhint: 'done',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    'aria-label': 'Answer',
    placeholder: 'Answer',
  });

  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9-]/g, '').slice(0, 6);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  });

  function draw() {
    clear(body);
    if (phase === 'intro') append(body, intro());
    else if (phase === 'playing') append(body, playing());
    else append(body, done());
  }

  function setLevel(next) {
    level = clampLevel(next);
    setGameDifficulty('MATH', level);
    draw();
  }

  function intro() {
    return gameScaffold({
      title: 'Math Sprint',
      subtitle: `Solve as many as you can in ${params().totalSeconds} seconds. · Day ${day}`,
      instructionLines: [
        levelBrief(level),
        'Type the answer, then tap Submit. Harder levels pay more XP per correct answer.',
      ],
      difficulty: level,
      onDifficultyChange: setLevel,
      onStart: start,
    });
  }

  function nextQuestion() {
    const problem = nextMathProblem(params());
    question = problem.question;
    expected = problem.answer;
  }

  function start() {
    secondsLeft = params().totalSeconds;
    correct = 0;
    attempted = 0;
    message = '';
    startedAt = Date.now();
    nextQuestion();
    phase = 'playing';
    draw();
    input.value = '';
    focusInput();

    if (ticker) clearInterval(ticker);
    ticker = setInterval(tick, 1000);
  }

  function tick() {
    if (phase !== 'playing') return;
    if (secondsLeft <= 1) {
      clearInterval(ticker);
      ticker = null;
      finish();
      return;
    }
    secondsLeft -= 1;
    updateHud();
  }

  function submit() {
    answer(input.value);
  }

  function answer(raw) {
    if (phase !== 'playing' || secondsLeft <= 0) return;
    const trimmed = String(raw).trim();
    const value = trimmed === '' || trimmed === '-' ? Number.NaN : Number.parseInt(trimmed, 10);

    if (Number.isNaN(value)) {
      message = 'Enter a number first';
      feedback.wrong();
      updateHud();
      focusInput();
      return;
    }

    attempted += 1;
    const was = expected;
    if (value === expected) {
      correct += 1;
      message = 'Correct!';
      feedback.correct();
    } else {
      message = `Not quite — it was ${was}`;
      feedback.wrong();
    }
    nextQuestion();
    input.value = '';
    updateHud();
    focusInput();
  }

  function focusInput() {
    if (document.activeElement !== input) input.focus();
  }

  function finish() {
    if (ticker) {
      clearInterval(ticker);
      ticker = null;
    }
    const score = correct * 50 * level;
    const accuracy = attempted === 0 ? 0 : correct / attempted;
    save = saveResult({
      gameType: 'MATH',
      score,
      durationMs: Date.now() - startedAt,
      accuracy,
      difficulty: level,
    });
    phase = 'done';
    draw();
  }

  function accuracyText() {
    return attempted === 0 ? '—' : `${Math.trunc((correct * 100) / attempted)}%`;
  }

  function updateHud() {
    if (statusEl) {
      statusEl.textContent = `Time: ${secondsLeft}s · Correct: ${correct} · ${levelName(level)}`;
    }
    if (questionEl) questionEl.textContent = question;
    if (feedbackEl) {
      feedbackEl.textContent = message;
      feedbackEl.className = `feedback ${
        message.startsWith('Correct') ? 'feedback--ok' : message ? 'feedback--bad' : ''
      }`;
    }
    if (progressFill) {
      const pct = (secondsLeft / Math.max(params().totalSeconds, 1)) * 100;
      progressFill.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
    }
  }

  function playing() {
    statusEl = h(
      'span',
      { class: 'value' },
      `Time: ${secondsLeft}s · Correct: ${correct} · ${levelName(level)}`,
    );
    const bar = progressBar({
      value: secondsLeft,
      total: params().totalSeconds,
      accent: 'var(--game-math)',
    });
    progressFill = bar.querySelector('.progress__bar');
    questionEl = h('div', { class: 'question question--gradient' }, question);
    feedbackEl = h('div', { class: 'feedback' }, message);

    return h(
      'div',
      { class: 'game-stack' },
      h('div', { class: 'hud-row' }, statusEl),
      bar,
      boardSize(
        560,
        h(
          'div',
          { class: 'game-stack' },
          questionEl,
          input,
          feedbackEl,
          holdFocus(button({ label: 'Submit', block: true, onClick: submit })),
          holdFocus(button({ label: 'Quit', block: true, variant: 'outlined', onClick: () => back('') })),
        ),
      ),
    );
  }

  function done() {
    return gameResultCard({
      title: 'Math Sprint complete',
      rows: [
        ['Correct', `${correct}/${attempted}`],
        ['Accuracy', accuracyText()],
        ['XP earned', `+${save.xp}`],
      ],
      isBest: save.isBest,
      onPlayAgain: start,
      onExit: () => back(''),
    });
  }

  draw();
  root.__cleanup = () => {
    if (ticker) clearInterval(ticker);
  };
  return root;
}

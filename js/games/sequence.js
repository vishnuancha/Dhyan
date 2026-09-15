// Sequence Recall — port of features/games/sequence/SequenceViewModel.kt + SequenceScreen.kt.

import {
  append,
  boardSize,
  clear,
  gameResultCard,
  gameScreen,
  gameScaffold,
  h,
  progressBar,
} from '../core/ui.js';
import { feedback } from '../core/feedback.js';
import { clampLevel, levelName, sequenceFor, tierFor } from '../core/difficulty.js';
import { randomInt } from '../core/random.js';
import { dayIndexFor, gameDifficultyFor, saveResult, setGameDifficulty } from '../state/store.js';
import { back } from '../router.js';

const TILE_COLORS = [
  'var(--coral)',
  'var(--blue)',
  'var(--green)',
  'var(--amber)',
  'var(--violet)',
  'var(--pink)',
  'var(--teal)',
  'var(--orange)',
  'var(--indigo)',
];

/** Long enough to see which tile was wrong and which one came next. */
const MISS_PAUSE_MS = 900;

/** Lets the completed pattern stay lit before the next round starts. */
const ROUND_PAUSE_MS = 500;

export function sequenceScreen() {
  const day = dayIndexFor('SEQUENCE');
  let level = clampLevel(gameDifficultyFor('SEQUENCE') ?? tierFor(day));
  const params = () => sequenceFor(level);

  let phase = 'intro';
  let sequence = [];
  let visibleCount = 0;
  let entered = 0;
  let enteredTiles = [];
  let wrongTile = null;
  let correctTile = null;
  let message = '';
  let rounds = 0;
  let roundNumber = 1;
  let longest = 0;
  let startedAt = 0;
  let save = null;
  let timers = [];

  const body = h('div');
  const root = gameScreen({ title: 'Sequence Recall', accent: 'var(--game-sequence)', onBack: () => back('') }, body);

  function clearTimers() {
    timers.forEach((id) => clearTimeout(id));
    timers = [];
  }

  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  function draw() {
    clear(body);
    if (phase === 'intro') append(body, intro());
    else if (phase === 'showing') append(body, showing());
    else if (phase === 'input') append(body, input());
    else append(body, done());
  }

  function setLevel(next) {
    level = clampLevel(next);
    setGameDifficulty('SEQUENCE', level);
    draw();
  }

  function intro() {
    const p = params();
    return gameScaffold({
      title: 'Sequence Recall',
      subtitle: `Watch the pattern, then repeat it. · Day ${day}`,
      instructionLines: [
        '1. Tiles light up one by one — memorise the order.',
        '2. Tap them back in the same order. Each tile you get right stays highlighted so you can see the taps land.',
        '3. One wrong tap ends the run: the tile you missed and the tile that was due both light up.',
        `${levelName(level)}: ${p.gridSize}×${p.gridSize} board · starts at ${p.startLength} tiles and grows to ${p.winLength}.`,
      ],
      difficulty: level,
      onDifficultyChange: setLevel,
      onStart: start,
    });
  }

  function randomTile() {
    const p = params();
    return randomInt(0, p.gridSize * p.gridSize - 1);
  }

  function start() {
    clearTimers();
    const p = params();
    rounds = 0;
    roundNumber = 1;
    longest = 0;
    startedAt = Date.now();
    sequence = [];
    for (let i = 0; i < p.startLength; i++) sequence.push(randomTile());
    showSequence(0);
  }

  function showSequence(delayBefore) {
    const p = params();
    clearTimers();
    phase = 'showing';
    visibleCount = 0;
    entered = 0;
    enteredTiles = [];
    wrongTile = null;
    correctTile = null;
    message = '';

    // The delay keeps the finished round's highlights on screen before the new pattern.
    later(() => {
      draw();
      sequence.forEach((_, index) => {
        later(() => {
          visibleCount = index + 1;
          if (phase === 'showing') draw();
        }, (index + 1) * p.revealMs);
      });
      later(() => {
        if (phase !== 'showing') return;
        phase = 'input';
        visibleCount = 0;
        entered = 0;
        enteredTiles = [];
        draw();
      }, sequence.length * p.revealMs + p.gapMs);
    }, delayBefore);
  }

  function tap(tile) {
    if (phase !== 'input') return;
    if (wrongTile !== null || entered >= sequence.length) return;

    if (tile !== sequence[entered]) {
      feedback.wrong();
      longest = Math.max(longest, entered);
      wrongTile = tile;
      correctTile = sequence[entered];
      message = `Missed — tile ${sequence[entered] + 1} came next.`;
      draw();
      clearTimers();
      later(finish, MISS_PAUSE_MS);
      return;
    }

    feedback.tap();
    entered += 1;
    enteredTiles = [...enteredTiles, tile];

    if (entered < sequence.length) {
      draw();
      return;
    }

    rounds += 1;
    roundNumber += 1;
    longest = Math.max(longest, sequence.length);
    const p = params();
    draw();

    if (sequence.length >= p.winLength) {
      later(finish, ROUND_PAUSE_MS);
    } else {
      sequence = [...sequence, randomTile()];
      showSequence(ROUND_PAUSE_MS);
    }
  }

  function finish() {
    clearTimers();
    const score = longest * 100 + rounds * 25;
    save = saveResult({
      gameType: 'SEQUENCE',
      score,
      durationMs: Date.now() - startedAt,
      accuracy: longest > 0 ? 0.7 : 0,
      difficulty: level,
    });
    phase = 'done';
    draw();
  }

  function tileGrid(enabled) {
    const size = params().gridSize;
    const grid = h('div', {
      class: 'grid',
      style: { 'grid-template-columns': `repeat(${size}, 1fr)` },
    });

    for (let tile = 0; tile < size * size; tile++) {
      const lit = visibleCount > 0 && tile === sequence[visibleCount - 1];
      const isEntered = enteredTiles.includes(tile);
      const isWrong = tile === wrongTile;
      const isCorrect = tile === correctTile;
      const accent = TILE_COLORS[tile % TILE_COLORS.length];

      const classes = ['tile', 'tile--number'];
      if (lit) classes.push('tile--lit');
      if (isEntered) classes.push('tile--entered');
      if (isWrong) classes.push('tile--wrong');
      if (isCorrect) classes.push('tile--correct');

      const style = {};
      if (lit || isCorrect) style.background = accent;
      else if (isEntered) style.background = `color-mix(in srgb, ${accent} 55%, transparent)`;

      grid.appendChild(
        h(
          'button',
          {
            class: classes.join(' '),
            type: 'button',
            disabled: !enabled,
            style,
            'aria-label': `Tile ${tile + 1}${isEntered ? ', tapped' : ''}`,
            onclick: () => tap(tile),
          },
          h('span', {}, String(tile + 1)),
          isEntered ? h('span', { class: 'tile__check' }, '✓') : null,
        ),
      );
    }
    return boardSize(520, grid);
  }

  function showing() {
    return h(
      'div',
      { class: 'game-stack' },
      h('div', { class: 'status' }, `Watch… (${visibleCount}/${sequence.length})`),
      tileGrid(false),
      h('p', { class: 'caption' }, `Round ${roundNumber} · memorise the order`),
    );
  }

  function input() {
    return h(
      'div',
      { class: 'game-stack' },
      h('div', { class: 'status' }, `Your turn · ${entered}/${sequence.length} taps`),
      progressBar({ value: entered, total: Math.max(sequence.length, 1), accent: 'var(--game-sequence)' }),
      message ? h('p', { class: 'feedback feedback--bad' }, message) : null,
      tileGrid(true),
    );
  }

  function done() {
    return gameResultCard({
      title: 'Sequence complete',
      rows: [
        ['Longest sequence', String(longest)],
        ['Rounds cleared', String(rounds)],
        ['XP earned', `+${save.xp}`],
      ],
      isBest: save.isBest,
      onPlayAgain: start,
      onExit: () => back(''),
    });
  }

  draw();
  root.__cleanup = clearTimers;
  return root;
}

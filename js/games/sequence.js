// Sequence Recall — port of features/games/sequence/SequenceViewModel.kt + SequenceScreen.kt.

import { append, boardSize, clear, gameResultCard, gameScreen, gameScaffold, h } from '../core/ui.js';
import { feedback } from '../core/feedback.js';
import { sequenceParams } from '../core/difficulty.js';
import { randomInt } from '../core/random.js';
import { dayIndexFor, saveResult } from '../state/store.js';
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

function gridSizeOf(sequence) {
  const max = (sequence.length ? Math.max(...sequence) : 8) + 1;
  return max > 9 ? 4 : 3;
}

export function sequenceScreen() {
  const day = dayIndexFor('SEQUENCE');
  const params = sequenceParams(day);

  let phase = 'intro';
  let sequence = [];
  let visibleCount = 0;
  let entered = 0;
  let rounds = 0;
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

  function intro() {
    return gameScaffold({
      title: 'Sequence Recall',
      subtitle: `Watch the pattern, then repeat it. · Day ${day}`,
      instructionLines: [
        `Tiles light up one by one. Tap them back in the same order. Sequence grows each round, up to ${params.winLength}.`,
      ],
      onStart: start,
    });
  }

  function start() {
    clearTimers();
    rounds = 0;
    longest = 0;
    entered = 0;
    startedAt = Date.now();
    sequence = [];
    for (let i = 0; i < params.startLength; i++) sequence.push(randomTile());
    showSequence();
  }

  function randomTile() {
    return randomInt(0, params.gridSize * params.gridSize - 1);
  }

  function showSequence() {
    phase = 'showing';
    visibleCount = 0;
    entered = 0;
    draw();

    sequence.forEach((_, index) => {
      later(() => {
        visibleCount = index + 1;
        if (phase === 'showing') draw();
      }, (index + 1) * params.revealMs);
    });

    later(
      () => {
        if (phase !== 'showing') return;
        phase = 'input';
        entered = 0;
        draw();
      },
      sequence.length * params.revealMs + params.gapMs,
    );
  }

  function tap(tile) {
    if (phase !== 'input') return;
    feedback.tap();
    if (tile === sequence[entered]) {
      entered += 1;
      if (entered === sequence.length) {
        rounds += 1;
        longest = Math.max(longest, sequence.length);
        if (sequence.length >= params.winLength) {
          finish();
          return;
        }
        sequence.push(randomTile());
        showSequence();
        return;
      }
      draw();
    } else {
      longest = Math.max(longest, sequence.length - 1);
      finish();
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
      difficulty: params.tier,
    });
    phase = 'done';
    draw();
  }

  function tileGrid(enabled) {
    const size = gridSizeOf(sequence);
    const grid = h('div', {
      class: 'grid',
      style: { 'grid-template-columns': `repeat(${size}, 1fr)` },
    });

    for (let tile = 0; tile < size * size; tile++) {
      const lit = visibleCount > 0 && tile === sequence[visibleCount - 1];
      grid.appendChild(
        h(
          'button',
          {
            class: `tile tile--number${lit ? ' tile--lit' : ''}`,
            type: 'button',
            disabled: !enabled,
            style: lit ? { background: TILE_COLORS[tile % TILE_COLORS.length] } : {},
            'aria-label': `Tile ${tile + 1}`,
            onclick: () => tap(tile),
          },
          h('span', {}, String(tile + 1)),
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
      h('p', { class: 'caption' }, `Round ${sequence.length - 2} · memorize the order`),
    );
  }

  function input() {
    return h(
      'div',
      { class: 'game-stack' },
      h('div', { class: 'status' }, `Your turn (${entered}/${sequence.length})`),
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

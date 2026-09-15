// Memory Match — port of features/games/memory/MemoryViewModel.kt + MemoryGameScreen.kt.

import {
  append,
  boardSize,
  button,
  clear,
  gameResultCard,
  gameScreen,
  gameScaffold,
  h,
  resultRow,
} from '../core/ui.js';
import { feedback } from '../core/feedback.js';
import { clampLevel, levelName, memoryFor, tierFor } from '../core/difficulty.js';
import { shuffle } from '../core/random.js';
import { dayIndexFor, gameDifficultyFor, saveResult, setGameDifficulty } from '../state/store.js';
import { back } from '../router.js';

const SYMBOLS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'0123456789'];

export function memoryScreen() {
  const day = dayIndexFor('MEMORY');
  let level = clampLevel(gameDifficultyFor('MEMORY') ?? tierFor(day));
  const params = () => memoryFor(level);

  let phase = 'intro';
  let cards = [];
  let gridSize = params().gridSize;
  let totalPairs = (gridSize * gridSize) / 2;
  let previewMs = params().previewMs;
  let moves = 0;
  let matched = 0;
  let lockBoard = false;
  let startedAt = 0;
  let result = null;
  let save = null;
  let previewTimer = null;

  const body = h('div');
  const root = gameScreen({ title: 'Memory Match', accent: 'var(--game-memory)', onBack: () => back('') }, body);

  function draw() {
    clear(body);
    if (phase === 'intro') append(body, intro());
    else if (phase === 'playing') append(body, playing());
    else append(body, done());
  }

  function setLevel(next) {
    level = clampLevel(next);
    setGameDifficulty('MEMORY', level);
    const levelParams = params();
    gridSize = levelParams.gridSize;
    totalPairs = (gridSize * gridSize) / 2;
    draw();
  }

  function intro() {
    const levelParams = params();
    const pairs = (levelParams.gridSize * levelParams.gridSize) / 2;
    return gameScaffold({
      title: 'Memory Match',
      subtitle: `Find all matching pairs. · Day ${day}`,
      instructionLines: [
        h('strong', { class: 'section-title' }, 'How to play'),
        '1. Tap a card — it flips face up and shows its symbol.',
        '2. Tap a second card to look for the matching symbol.',
        '3. A matching pair stays open. A miss flips both cards back, so remember where they were.',
        '4. Clear every pair to finish. Fewer moves and less time = higher score.',
        `${levelName(level)}: ${levelParams.gridSize}×${levelParams.gridSize} grid · ${pairs} pairs · ` +
          `missed cards stay visible ${levelParams.previewMs / 1000}s.`,
      ],
      difficulty: level,
      onDifficultyChange: setLevel,
      onStart: start,
    });
  }

  function start() {
    const levelParams = params();
    gridSize = levelParams.gridSize;
    totalPairs = (gridSize * gridSize) / 2;
    previewMs = levelParams.previewMs;
    const symbols = SYMBOLS.slice(0, totalPairs);
    cards = shuffle([...symbols, ...symbols]).map((symbol) => ({
      symbol,
      faceUp: false,
      matched: false,
    }));
    moves = 0;
    matched = 0;
    lockBoard = false;
    previewTimer = null;
    startedAt = Date.now();
    phase = 'playing';
    draw();
  }

  function faceUpNow() {
    return cards.filter((c) => c.faceUp && !c.matched);
  }

  function flip(index) {
    if (phase !== 'playing' || lockBoard) return;
    const card = cards[index];
    if (!card || card.faceUp || card.matched) return;
    if (faceUpNow().length >= 2) return;

    card.faceUp = true;
    const open = faceUpNow();

    if (open.length === 2) {
      moves += 1;
      if (open[0].symbol === open[1].symbol) {
        open.forEach((c) => {
          c.matched = true;
          c.faceUp = false;
        });
        matched += 1;
        if (matched === totalPairs) {
          finish();
          return;
        }
      } else {
        lockBoard = true;
        previewTimer = setTimeout(() => {
          cards.filter((c) => !c.matched).forEach((c) => {
            c.faceUp = false;
          });
          lockBoard = false;
          draw();
        }, previewMs);
      }
    }
    draw();
  }

  function finish() {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const score = Math.max(totalPairs * 100 - moves * 5 - seconds, 10);
    const accuracy = Math.min(totalPairs / Math.max(moves, 1), 1);
    save = saveResult({
      gameType: 'MEMORY',
      score,
      durationMs: Date.now() - startedAt,
      accuracy,
      difficulty: level,
    });
    result = { score, moves, seconds };
    phase = 'done';
    draw();
  }

  function playing() {
    const grid = h('div', {
      class: 'grid',
      style: { 'grid-template-columns': `repeat(${gridSize}, 1fr)` },
    });

    cards.forEach((card, index) => {
      const shown = card.faceUp || card.matched;
      grid.appendChild(
        h(
          'button',
          {
            class: `tile${card.matched ? ' tile--matched' : ''}`,
            type: 'button',
            'aria-label': shown ? `Card ${card.symbol}` : `Hidden card ${index + 1}`,
            onclick: () => {
              feedback.tap();
              flip(index);
            },
          },
          shown ? card.symbol : '?',
        ),
      );
    });

    return h(
      'div',
      { class: 'game-stack' },
      resultRow('Moves', String(moves)),
      resultRow('Pairs', `${matched}/${totalPairs}`),
      boardSize(560, grid),
      button({ label: 'Quit', block: true, onClick: () => back('') }),
    );
  }

  function done() {
    return gameResultCard({
      title: 'Memory complete',
      rows: [
        ['Score', String(result.score)],
        ['Moves', String(result.moves)],
        ['Time', `${result.seconds}s`],
        ['XP earned', `+${save.xp}`],
      ],
      isBest: save.isBest,
      onPlayAgain: start,
      onExit: () => back(''),
    });
  }

  draw();
  root.__cleanup = () => {
    if (previewTimer) clearTimeout(previewTimer);
  };
  return root;
}

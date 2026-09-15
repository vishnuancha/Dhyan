// Sudoku — port of features/games/sudoku/SudokuViewModel.kt + SudokuScreen.kt.

import {
  append,
  boardSize,
  button,
  clear,
  gameResultCard,
  gameScreen,
  gameScaffold,
  h,
} from '../core/ui.js';
import { feedback } from '../core/feedback.js';
import { clampLevel, levelName, sudokuMistakesFor, sudokuPhaseFor, tierFor } from '../core/difficulty.js';
import { sudokuForDifficulty } from '../data/sudoku-puzzles.js';
import { dayIndexFor, gameDifficultyFor, saveResult, setGameDifficulty } from '../state/store.js';
import { back } from '../router.js';

function boardHint(size, boxRows, boxCols) {
  return size <= 6
    ? `Fill the grid so every row, column and ${boxRows}×${boxCols} box contains 1–${size}.`
    : 'Fill the grid so every row, column and box contains 1–9.';
}

function levelBrief(level, mistakesAllowed) {
  switch (clampLevel(level)) {
    case 1:
      return `Easy: 6×6 grid · ${mistakesAllowed} mistakes allowed.`;
    case 2:
      return `Medium: 9×9 grid · ${mistakesAllowed} mistakes allowed.`;
    default:
      return `Hard: 9×9 grid with most cells blank · ${mistakesAllowed} mistakes allowed.`;
  }
}

export function sudokuScreen() {
  const day = dayIndexFor('SUDOKU');
  let level = clampLevel(gameDifficultyFor('SUDOKU') ?? tierFor(day));
  const allowed = () => sudokuMistakesFor(level);
  const puzzlePhase = () => sudokuPhaseFor(level);

  let phaseName = 'intro';
  let puzzle = null;
  let cells = [];
  let selected = -1;
  let mistakes = 0;
  let errorCell = -1;
  let startedAt = 0;
  let save = null;
  let result = null;

  const body = h('div');
  const root = gameScreen({ title: 'Sudoku', accent: 'var(--game-sudoku)', onBack: () => back('') }, body);

  document.addEventListener('keydown', onKeyDown);
  root.__cleanup = () => document.removeEventListener('keydown', onKeyDown);

  function draw() {
    clear(body);
    if (phaseName === 'intro') append(body, intro());
    else if (phaseName === 'playing') append(body, playing());
    else append(body, done());
  }

  function setLevel(next) {
    level = clampLevel(next);
    setGameDifficulty('SUDOKU', level);
    draw();
  }

  function intro() {
    const size = puzzlePhase() <= 1 ? 6 : 9;
    return gameScaffold({
      title: 'Sudoku',
      subtitle: boardHint(size, size === 6 ? 2 : 3, 3),
      instructionLines: [
        levelBrief(level, allowed()),
        `Day ${day}. Tap a cell, then tap a number below it. Erase clears a cell you filled.`,
      ],
      difficulty: level,
      onDifficultyChange: setLevel,
      onStart: start,
    });
  }

  function start() {
    puzzle = sudokuForDifficulty(puzzlePhase());
    cells = puzzle.givens.slice();
    selected = -1;
    mistakes = 0;
    errorCell = -1;
    startedAt = Date.now();
    phaseName = 'playing';
    draw();
  }

  function isGiven(index) {
    return puzzle.givens[index] !== 0;
  }

  function finish(won) {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const score =
      level <= 1
        ? won
          ? Math.max(400 - seconds - mistakes * 30, 30)
          : 10
        : won
          ? Math.max(900 - seconds - mistakes * 50, 50)
          : 10;
    save = saveResult({
      gameType: 'SUDOKU',
      score,
      durationMs: Date.now() - startedAt,
      accuracy: won ? 0.9 : 0.2,
      difficulty: level,
    });
    result = { won, seconds, mistakes };
    phaseName = 'done';
    draw();
  }

  function enter(value) {
    if (phaseName !== 'playing' || selected < 0 || isGiven(selected)) return false;
    if (puzzle.solution[selected] === value) {
      cells[selected] = value;
      errorCell = -1;
      if (!cells.some((v) => v === 0)) {
        feedback.correct();
        finish(true);
        return true;
      }
      draw();
      return true;
    }

    mistakes += 1;
    errorCell = selected;
    if (mistakes >= allowed()) {
      finish(false);
      return false;
    }
    draw();
    return false;
  }

  function erase() {
    if (selected < 0 || isGiven(selected)) return;
    cells[selected] = 0;
    errorCell = -1;
    draw();
  }

  function select(index) {
    selected = index;
    errorCell = -1;
    draw();
  }

  function moveSelection(dRow, dCol) {
    const n = puzzle.size;
    if (selected < 0) {
      selected = 0;
    } else {
      const row = Math.floor(selected / n);
      const col = selected % n;
      const nextRow = (row + dRow + n) % n;
      const nextCol = (col + dCol + n) % n;
      selected = nextRow * n + nextCol;
    }
    errorCell = -1;
    draw();
  }

  function onKeyDown(event) {
    if (phaseName !== 'playing' || !puzzle) return;
    const n = puzzle.size;
    if (event.key === 'ArrowUp') return moveSelection(-1, 0);
    if (event.key === 'ArrowDown') return moveSelection(1, 0);
    if (event.key === 'ArrowLeft') return moveSelection(0, -1);
    if (event.key === 'ArrowRight') return moveSelection(0, 1);
    if (event.key === 'Backspace' || event.key === 'Delete') return erase();
    if (/^[1-9]$/.test(event.key)) {
      const value = Number(event.key);
      if (value <= n && selected >= 0) {
        if (enter(value)) feedback.correct();
        else feedback.wrong();
      }
    }
    return undefined;
  }

  function board() {
    const n = puzzle.size;
    const selectedValue = selected >= 0 ? cells[selected] : 0;
    const selRow = selected >= 0 ? Math.floor(selected / n) : -1;
    const selCol = selected >= 0 ? selected % n : -1;

    const grid = h('div', {
      class: 'sudoku',
      style: { 'grid-template-columns': `repeat(${n}, 1fr)` },
      role: 'grid',
    });

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const index = r * n + c;
        const value = cells[index];
        const given = isGiven(index);
        const inUnit =
          selected >= 0 &&
          (selRow === r ||
            selCol === c ||
            (Math.floor(selRow / puzzle.boxRows) === Math.floor(r / puzzle.boxRows) &&
              Math.floor(selCol / puzzle.boxCols) === Math.floor(c / puzzle.boxCols)));

        const classes = ['sudoku__cell'];
        if (given) classes.push('sudoku__cell--given');
        if (index === errorCell) classes.push('sudoku__cell--error');
        else if (index === selected) classes.push('sudoku__cell--selected');
        else if (value !== 0 && value === selectedValue) classes.push('sudoku__cell--same');
        else if (inUnit) classes.push('sudoku__cell--unit');
        if ((c + 1) % puzzle.boxCols === 0 && c !== n - 1) classes.push('sudoku__cell--thick-right');
        if ((r + 1) % puzzle.boxRows === 0 && r !== n - 1) classes.push('sudoku__cell--thick-bottom');
        if (c === n - 1) classes.push('sudoku__cell--last-col');
        if (r === n - 1) classes.push('sudoku__cell--last-row');

        grid.appendChild(
          h(
            'button',
            {
              class: classes.join(' '),
              type: 'button',
              style: { 'font-size': n <= 6 ? '24px' : '18px' },
              'aria-label': `Row ${r + 1} column ${c + 1}, ${value === 0 ? 'empty' : `value ${value}`}`,
              onclick: () => select(index),
            },
            value === 0 ? '' : String(value),
          ),
        );
      }
    }
    return grid;
  }

  function numberPad() {
    const n = puzzle.size;
    const perRow = n > 6 ? 5 : n;
    const pad = h('div', { class: 'numpad', style: { 'grid-template-columns': `repeat(${perRow}, 1fr)` } });

    for (let value = 1; value <= n; value++) {
      const remaining = n - cells.filter((v) => v === value).length;
      const done = remaining <= 0;
      pad.appendChild(
        h(
          'button',
          {
            class: 'numpad__key',
            type: 'button',
            disabled: selected < 0 || done,
            'aria-label': `Enter ${value}, ${remaining} left`,
            onclick: () => {
              if (enter(value)) feedback.correct();
              else feedback.wrong();
            },
          },
          h('strong', {}, String(value)),
          h('span', {}, String(remaining)),
        ),
      );
    }
    return pad;
  }

  function playing() {
    const filled = cells.filter((v) => v !== 0).length;
    const total = puzzle.size * puzzle.size;

    let hint = 'Select a cell first, then tap a number.';
    let hintClass = 'caption';
    if (selected >= 0 && errorCell >= 0) {
      hint = "That number doesn't go there. Try again.";
      hintClass = 'caption feedback--bad';
    }

    return h(
      'div',
      { class: 'game-stack' },
      h(
        'div',
        { class: 'hud-row' },
        h('span', { class: 'value' }, `Mistakes: ${mistakes}/${allowed()} · Filled: ${filled}/${total}`),
      ),
      boardSize(
        520,
        h(
          'div',
          { class: 'game-stack' },
          board(),
          h('p', { class: hintClass }, hint),
          numberPad(),
          h(
            'div',
            { class: 'card__row' },
            button({ label: 'Erase', variant: 'outlined', flex: true, onClick: erase }),
            button({ label: 'Quit', flex: true, onClick: () => back('') }),
          ),
        ),
      ),
    );
  }

  function done() {
    return gameResultCard({
      title: result.won ? 'Sudoku solved!' : 'Out of mistakes',
      rows: [
        ['Time', `${result.seconds}s`],
        ['Mistakes', String(result.mistakes)],
        ['XP earned', `+${save.xp}`],
      ],
      isBest: save.isBest,
      onPlayAgain: start,
      onExit: () => back(''),
    });
  }

  draw();
  return root;
}

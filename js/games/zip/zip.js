// Zip — port of features/games/zip/ZipViewModel.kt + ZipScreen.kt.
// Three modes (campaign, daily, endless) over a canvas board with drag-to-draw.

import { append, boardSize, button, clear, gameScreen, h } from '../../core/ui.js';
import { feedback } from '../../core/feedback.js';
import { tierFor } from '../../core/difficulty.js';
import { todayString } from '../../core/dates.js';
import {
  dayIndexFor,
  recordZipDaily,
  recordZipEndless,
  recordZipLevelWin,
  saveResult,
  zipProgress,
} from '../../state/store.js';
import { back } from '../../router.js';
import { campaignBoard, dailyBoard, endlessBoard } from './boards.js';
import { CAMPAIGN_COUNT } from './puzzles.js';
import {
  commonPrefix,
  fmtPar,
  fmtTime,
  hintCell,
  isSolved,
  parFor,
  scoreFor,
  starText,
  starsFor,
  step as zipStep,
} from './logic.js';

const CELEBRATION_MS = 900;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function zipScreen() {
  const today = todayString();
  const day = dayIndexFor('ZIP');
  const tier = tierFor(day);
  let progress = zipProgress();

  let view = 'menu';
  let preparing = false;
  let preparingMode = '';
  let currentMode = 'campaign';

  let board = null;
  let path = [];
  let hintIndex = -1;
  let hintsUsed = 0;
  let elapsedSec = 0;
  let parSec = 60;
  let parText = '';
  let boardStartedAt = 0;
  let solved = false;

  let campaignLevel = 1;
  let runLevel = 1;
  let runCleared = 0;
  let runTotalSec = 0;
  let runSeed = 0;
  let outcome = null;

  let canvas = null;
  let ctx = null;
  let csSize = 0;
  let finger = null;
  let hudTime = null;
  let hudStatus = null;
  let ticker = null;
  let celebrateTimer = null;
  let paintFrame = null;
  let hintStart = 0;

  const body = h('div');
  const root = gameScreen({ title: 'Zip', accent: 'var(--game-zip)', onBack: () => (view === 'menu' ? back('') : toMenu()) }, body);

  root.__cleanup = () => {
    stopTicker();
    if (celebrateTimer) clearTimeout(celebrateTimer);
    if (paintFrame) cancelAnimationFrame(paintFrame);
  };

  /* ---------- state transitions ---------- */

  function render() {
    clear(body);
    if (view === 'menu') append(body, menuView());
    else if (view === 'playing') append(body, playingView());
    else if (view === 'won') append(body, wonView());
    else append(body, runOverView());
  }

  function startTicker() {
    stopTicker();
    ticker = setInterval(() => {
      if (view !== 'playing') return;
      elapsedSec += 1;
      if (hudTime) hudTime.textContent = fmtTime(elapsedSec);
    }, 1000);
  }

  function stopTicker() {
    if (ticker) clearInterval(ticker);
    ticker = null;
  }

  function beginBoard(next) {
    board = next;
    path = [Number(Object.keys(board.numbers).find((cell) => board.numbers[cell] === 1))];
    hintsUsed = 0;
    hintIndex = -1;
    elapsedSec = 0;
    solved = false;
    parSec = parFor(board.size * board.size, Object.keys(board.numbers).length);
    parText = fmtPar(parSec);
    boardStartedAt = Date.now();
    view = 'playing';
    startTicker();
    render();
  }

  function startCampaign(level) {
    campaignLevel = Math.min(Math.max(level, 1), CAMPAIGN_COUNT);
    beginBoard(campaignBoard(campaignLevel));
  }

  async function startDaily() {
    if (preparing) return;
    preparing = true;
    preparingMode = 'daily';
    render();
    const next = await dailyBoard(today, day);
    preparing = false;
    preparingMode = '';
    beginBoard(next);
  }

  async function startEndless() {
    if (preparing) return;
    preparing = true;
    preparingMode = 'endless';
    render();
    runSeed = Date.now() >>> 0;
    runLevel = 1;
    runCleared = 0;
    runTotalSec = 0;
    const next = await endlessBoard(runLevel, runSeed);
    preparing = false;
    preparingMode = '';
    beginBoard(next);
  }

  function toMenu() {
    stopTicker();
    if (view === 'playing' && board && currentMode === 'endless' && runCleared > 0) {
      bankRun(runCleared, runTotalSec);
      return;
    }
    view = 'menu';
    progress = zipProgress();
    render();
  }

  /* ---------- moves ---------- */

  function moveTo(index) {
    if (!board || solved || view !== 'playing') return false;
    const next = zipStep(board.size, board.walls, board.numbers, path, index);
    if (next === null) return false;
    path = next;
    hintIndex = -1;
    if (isSolved(board.size, board.numbers, path)) {
      solved = true;
      celebrate();
    }
    paint();
    return true;
  }

  function undo() {
    if (!board || solved || path.length <= 1) return;
    path = path.slice(0, -1);
    hintIndex = -1;
    paint();
  }

  function clearPath() {
    if (!board || solved) return;
    path = [path[0]];
    hintIndex = -1;
    paint();
  }

  function useHint() {
    if (!board || solved) return;
    const keep = commonPrefix(board.solution, path);
    path = keep <= 0 ? [board.solution[0]] : path.slice(0, keep);
    hintIndex = hintCell(board.solution, path);
    hintsUsed += 1;
    hintStart = performance.now();
    paint();
  }

  function celebrate() {
    const snapshot = path.join(',');
    stopTicker();
    celebrateTimer = setTimeout(() => {
      if (path.join(',') !== snapshot) return;
      win();
    }, CELEBRATION_MS);
  }

  function win() {
    stopTicker();
    const seconds = Math.floor((Date.now() - boardStartedAt) / 1000);
    const cells = board.size * board.size;
    const checkpoints = Object.keys(board.numbers).length;
    const score =
      currentMode === 'endless'
        ? scoreFor(cells, checkpoints, runLevel, seconds, hintsUsed)
        : scoreFor(cells, checkpoints, currentMode === 'campaign' ? campaignLevel : 3, seconds, hintsUsed);

    const save = saveResult({
      gameType: 'ZIP',
      score,
      durationMs: Math.max(Date.now() - boardStartedAt, 1000),
      accuracy: 1,
      difficulty: tier,
    });

    if (currentMode === 'campaign') {
      const stars = starsFor(seconds, parSec);
      recordZipLevelWin(campaignLevel, stars);
      outcome = { kind: 'campaign', stars, score, seconds, xp: save.xp, isBest: save.isBest };
    } else if (currentMode === 'daily') {
      recordZipDaily(today);
      outcome = { kind: 'daily', stars: starsFor(seconds, parSec), score, seconds, xp: save.xp, isBest: save.isBest };
    } else {
      runCleared += 1;
      runTotalSec += seconds;
      recordZipEndless(runCleared);
      outcome = { kind: 'endless', seconds, boardScore: score, xp: save.xp, isBest: save.isBest };
    }

    progress = zipProgress();
    view = 'won';
    render();
  }

  function bankRun(boards, seconds) {
    stopTicker();
    const score = boards <= 0 ? 10 : Math.max(boards * 800 - seconds * 2, 20);
    const save = saveResult({
      gameType: 'ZIP',
      score,
      durationMs: Math.max(seconds * 1000, 1000),
      accuracy: 1,
      difficulty: tier,
    });
    recordZipEndless(boards);
    runTotalSec = seconds;
    outcome = { kind: 'runOver', boards, seconds, score, xp: save.xp, isBest: save.isBest };
    progress = zipProgress();
    view = 'runOver';
    render();
  }

  async function nextBoard(nextLevel) {
    runLevel = nextLevel;
    beginBoard(await endlessBoard(runLevel, runSeed));
  }

  /* ---------- views ---------- */

  function levelLabel(level, locked) {
    if (locked) return `${level} 🔒`;
    const stars = progress.stars[level] || 0;
    return `${level} ${starText(stars)}`.trim();
  }

  function menuView() {
    const total = CAMPAIGN_COUNT;
    const unlocked = progress.unlockedLevel;
    const totalStars = Object.values(progress.stars).reduce((sum, s) => sum + s, 0);
    const clearedAll = unlocked > total;
    const done = progress.lastDaily === today && today !== '';
    const current = Math.min(unlocked, total);

    const levelButtons = h('div', { class: 'level-list' });
    for (let level = 1; level <= total; level++) {
      const locked = level > unlocked;
      const isCurrent = level === current && !locked;
      levelButtons.appendChild(
        h(
          'button',
          {
            class: `level-btn${isCurrent ? ' level-btn--current' : ''}`,
            type: 'button',
            disabled: locked,
            onclick: () => {
              currentMode = 'campaign';
              startCampaign(level);
            },
          },
          levelLabel(level, locked),
        ),
      );
    }

    return h(
      'div',
      { class: 'card' },
      h('p', {}, 'Draw one line from 1 through every number in order, filling every cell.'),
      h('p', { class: 'caption' }, "Bold lines between cells are walls — the path can't cross them. Drag back over your trail to undo a step."),
      h('hr', { class: 'divider' }),

      h(
        'div',
        { class: 'card' },
        h('h2', { class: 'card__title' }, 'Campaign'),
        h(
          'p',
          { class: 'card__note' },
          clearedAll
            ? `All ${total} levels cleared! Replay any board for 3 stars.`
            : `Level ${current} of ${total} · ${totalStars}/${total * 3} stars`,
        ),
        levelButtons,
      ),

      h(
        'div',
        { class: 'card' },
        h('h2', { class: 'card__title' }, `Daily puzzle · Day ${day}`),
        h(
          'p',
          { class: 'card__note' },
          done
            ? `Today's board (${today}) is done. Come back tomorrow.`
            : `One fresh board every day (${today}). Same for everyone.`,
        ),
        button({
          label: done ? 'Replay daily' : 'Play daily',
          block: true,
          disabled: preparing,
          onClick: () => {
            currentMode = 'daily';
            startDaily();
          },
        }),
        preparingMode === 'daily' ? preparingLine() : null,
      ),

      h(
        'div',
        { class: 'card' },
        h('h2', { class: 'card__title' }, 'Endless run'),
        h(
          'p',
          { class: 'card__note' },
          `Chain boards back to back. Boards grow from 5×5 to 8×8. Best: ${progress.endlessBest} boards.`,
        ),
        button({
          label: 'Start run',
          block: true,
          disabled: preparing,
          onClick: () => {
            currentMode = 'endless';
            startEndless();
          },
        }),
        preparingMode === 'endless' ? preparingLine() : null,
      ),

      howToPlay(),
    );
  }

  function preparingLine() {
    return h(
      'div',
      { class: 'preparing' },
      h('span', { class: 'spinner' }),
      'Building a board with one unique solution…',
    );
  }

  function howToPlay() {
    const dots = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    dots.setAttribute('viewBox', '0 0 64 64');
    dots.setAttribute('width', '64');
    dots.setAttribute('height', '64');
    dots.innerHTML =
      '<circle cx="12" cy="50" r="5" fill="#8B5CF6"/><circle cx="32" cy="32" r="5" fill="#8B5CF6"/>' +
      '<circle cx="52" cy="14" r="5" fill="#8B5CF6"/><path d="M12 50 32 32 52 14" stroke="#E84727" stroke-width="5" fill="none" stroke-linecap="round"/>';

    const fill = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    fill.setAttribute('viewBox', '0 0 64 64');
    fill.setAttribute('width', '64');
    fill.setAttribute('height', '64');
    fill.innerHTML =
      '<rect x="6" y="6" width="52" height="52" rx="8" fill="none" stroke="currentColor" stroke-width="3" opacity="0.4"/>' +
      '<path d="M12 12h40v40H12z" fill="none"/><path d="M12 12h40v40H12" fill="none"/>' +
      '<path d="M14 18h36v28H14z" fill="#E84727" opacity="0.25"/><path d="M14 18h36" stroke="#E84727" stroke-width="4"/>';

    return h(
      'div',
      { class: 'card' },
      h('h2', { class: 'card__title' }, 'How to play'),
      h(
        'div',
        { class: 'how-to' },
        h('figure', {}, dots, h('figcaption', {}, 'Connect the dots in order')),
        h('figure', {}, fill, h('figcaption', {}, 'Fill every cell')),
      ),
    );
  }

  function playingView() {
    const cells = board.size * board.size;
    const full = path.length === cells;

    hudTime = h('span', { class: 'value' }, fmtTime(elapsedSec));
    hudStatus = h('span', { class: 'value' }, `${path.length}/${cells} cells · par ${parText}`);

    const wrap = h('div', {
      class: 'zip-canvas-wrap',
      style: { maxWidth: 'min(560px, calc(100dvh - 300px))' },
    });

    canvas = h('canvas', { class: 'zip-canvas', role: 'img', 'aria-label': `Zip board, ${path.length} of ${cells} cells filled` });
    wrap.appendChild(canvas);
    attachCanvas();

    const title =
      currentMode === 'campaign'
        ? `Level ${campaignLevel}/${CAMPAIGN_COUNT} · ${board.label}`
        : currentMode === 'daily'
          ? `Daily · ${board.label}`
          : `Run ${runLevel} · cleared ${runCleared}`;

    return h(
      'div',
      { class: 'card' },
      h('p', { class: 'caption' }, title),
      h(
        'div',
        { class: 'hud-row' },
        h('span', { class: 'hud-row' }, h('span', { class: 'caption' }, '⏱ '), hudTime),
        button({ label: 'Clear', variant: 'text', disabled: solved, ariaLabel: 'Clear path', onClick: clearPath }),
      ),
      boardSize(560, wrap),
      h(
        'div',
        { class: 'hud-row' },
        h('span', { class: solved ? 'status feedback--ok' : 'caption' }, solved ? 'Solved!' : ''),
        hudStatus,
      ),
      full && !solved
        ? h('p', { class: 'feedback feedback--bad' }, 'Every cell is filled, but the line has to finish on the highest number. Undo and re-route.')
        : null,
      h('p', { class: 'caption' }, `Par ${parText} · ${board.hint}`),
      h(
        'div',
        { class: 'card__row' },
        button({ label: 'Undo', variant: 'outlined', flex: true, disabled: solved, ariaLabel: 'Undo last step', onClick: undo }),
        button({ label: 'Hint', variant: 'outlined', flex: true, disabled: solved, ariaLabel: 'Reveal the next correct step', onClick: () => { feedback.tap(); useHint(); } }),
      ),
      button({ label: 'Quit', block: true, onClick: toMenu }),
    );
  }

  function wonView() {
    if (outcome.kind === 'campaign') {
      return h(
        'div',
        { class: 'card' },
        h('h2', { class: 'card__title' }, `Level ${campaignLevel} complete ${starText(outcome.stars)}`),
        outcome.isBest ? h('span', { class: 'chip chip--amber' }, 'New best!') : null,
        row('Time', `${fmtTime(outcome.seconds)} (par ${parText})`),
        row('Hints used', String(hintsUsed)),
        row('Score', String(outcome.score)),
        row('XP earned', `+${outcome.xp}`),
        h(
          'div',
          { class: 'card__row' },
          campaignLevel < CAMPAIGN_COUNT
            ? button({ label: 'Next level →', flex: true, onClick: () => startCampaign(campaignLevel + 1) })
            : null,
          button({ label: 'Level select', variant: 'outlined', flex: true, onClick: toMenu }),
        ),
      );
    }

    if (outcome.kind === 'daily') {
      return h(
        'div',
        { class: 'card' },
        h('h2', { class: 'card__title' }, `Daily complete ${starText(outcome.stars)}`),
        outcome.isBest ? h('span', { class: 'chip chip--amber' }, 'New best!') : null,
        row('Time', `${fmtTime(outcome.seconds)} (par ${parText})`),
        row('Hints used', String(hintsUsed)),
        row('XP earned', `+${outcome.xp}`),
        button({ label: 'Back to menu', block: true, onClick: toMenu }),
      );
    }

    return h(
      'div',
      { class: 'card' },
      h('h2', { class: 'card__title' }, `Board ${runLevel} cleared!`),
      row('Board time', fmtTime(outcome.seconds)),
      row('Board score', String(outcome.boardScore)),
      row('Run total', `${runCleared} boards · ${fmtTime(runTotalSec)}`),
      h(
        'div',
        { class: 'card__row' },
        button({ label: 'Next board →', flex: true, onClick: () => (async () => nextBoard(runLevel + 1))() }),
        button({ label: `Bank run (${runCleared} boards)`, variant: 'outlined', flex: true, onClick: () => bankRun(runCleared, runTotalSec) }),
      ),
    );
  }

  function runOverView() {
    const boards = outcome ? outcome.boards : runCleared;
    return h(
      'div',
      { class: 'card' },
      h('h2', { class: 'card__title' }, boards > 0 ? `Run over — ${boards} boards!` : 'Run over'),
      outcome && outcome.isBest ? h('span', { class: 'chip chip--amber' }, 'New best!') : null,
      row('Boards', String(boards)),
      row('Time', fmtTime(outcome ? outcome.seconds : runTotalSec)),
      row('Score', String(outcome ? outcome.score : 0)),
      row('XP earned', `+${outcome ? outcome.xp : 0}`),
      h(
        'div',
        { class: 'card__row' },
        button({ label: 'New run', flex: true, onClick: () => { currentMode = 'endless'; startEndless(); } }),
        button({ label: 'Back to menu', variant: 'outlined', flex: true, onClick: toMenu }),
      ),
    );
  }

  function row(label, value) {
    return h('div', { class: 'hud-row' }, h('span', { class: 'label' }, label), h('span', { class: 'value' }, value));
  }

  /* ---------- canvas ---------- */

  function attachCanvas() {
    const rect = () => canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const width = canvas.clientWidth || 320;
      csSize = width;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(width * dpr);
      canvas.style.height = `${width}px`;
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }
    requestAnimationFrame(resize);

    const cellAt = (event) => {
      const box = rect();
      const n = board.size;
      const cell = box.width / n;
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const col = Math.floor(x / cell);
      const row = Math.floor(y / cell);
      if (row < 0 || col < 0 || row >= n || col >= n) return null;
      return row * n + col;
    };

    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture?.(event.pointerId);
      const index = cellAt(event);
      if (index !== null && moveTo(index)) finger = index;
      else finger = null;
    });

    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse' && event.buttons === 0) return;
      const target = cellAt(event);
      if (target === null) return;
      const n = board.size;
      const hop = finger === null ? target : nearestOrthogonal(finger, target, n);
      if (hop !== finger && moveTo(hop)) finger = hop;
    });

    const release = () => {
      finger = null;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse' && event.buttons === 0) finger = null;
    });
  }

  function nearestOrthogonal(from, to, size) {
    const fr = Math.floor(from / size);
    const fc = from % size;
    const tr = Math.floor(to / size);
    const tc = to % size;
    const dr = Math.abs(tr - fr);
    const dc = Math.abs(tc - fc);
    if (dr === 0 || dc === 0) return to;
    return dc >= dr ? fr * size + tc : tr * size + fc;
  }

  function cellCenter(index, cell) {
    const n = board.size;
    const col = index % n;
    const row = Math.floor(index / n);
    return { x: (col + 0.5) * cell, y: (row + 0.5) * cell };
  }

  function paint() {
    if (!ctx || !board || !canvas) return;
    if (hudStatus) {
      const cells = board.size * board.size;
      hudStatus.textContent = solved ? 'Solved!' : `${path.length}/${cells} cells · par ${parText}`;
    }

    const n = board.size;
    const size = csSize;
    const cell = size / n;
    const onSurface = cssVar('--on-surface') || '#1C1B22';
    const surface = cssVar('--surface') || '#FAF9FF';
    const outline = cssVar('--outline') || 'rgba(0,0,0,.28)';
    const vermilion = cssVar('--vermilion') || '#E84727';

    ctx.clearRect(0, 0, size, size);

    // grid
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(cell * 0.022, 1);
    ctx.beginPath();
    for (let i = 1; i < n; i++) {
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, size);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(size, i * cell);
    }
    ctx.stroke();

    // walls
    ctx.strokeStyle = onSurface;
    ctx.lineWidth = cell * 0.17;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const key of board.walls) {
      const [a, b] = key.split(':').map(Number);
      const ar = Math.floor(a / n);
      const ac = a % n;
      const br = Math.floor(b / n);
      const bc = b % n;
      if (ar === br) {
        const x = Math.max(ac, bc) * cell;
        ctx.moveTo(x, ar * cell);
        ctx.lineTo(x, ar * cell + cell);
      } else {
        const y = Math.max(ar, br) * cell;
        ctx.moveTo(ac * cell, y);
        ctx.lineTo(ac * cell + cell, y);
      }
    }
    ctx.stroke();

    const head = path[path.length - 1];
    const haloAlpha = solved ? 0.55 : 0.26;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (path.length === 1) {
      const center = cellCenter(head, cell);
      ctx.fillStyle = `${vermilion}${alphaHex(haloAlpha)}`;
      ctx.beginPath();
      ctx.arc(center.x, center.y, cell * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = `${vermilion}${alphaHex(haloAlpha)}`;
      ctx.lineWidth = cell * 0.76;
      strokePath(cell);
    }

    // head dot
    const headCenter = cellCenter(head, cell);
    ctx.fillStyle = `${vermilion}${alphaHex(0.28)}`;
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y, cell * 0.2, 0, Math.PI * 2);
    ctx.fill();

    if (path.length > 1) {
      ctx.strokeStyle = vermilion;
      ctx.lineWidth = cell * 0.44;
      strokePath(cell);
    }

    // hint ring
    if (hintIndex >= 0) {
      const elapsed = performance.now() - hintStart;
      const pulse = 0.25 + 0.75 * Math.abs(Math.sin(elapsed / 650));
      const center = cellCenter(hintIndex, cell);
      ctx.strokeStyle = `${vermilion}${alphaHex(pulse)}`;
      ctx.lineWidth = cell * 0.07;
      ctx.beginPath();
      ctx.arc(center.x, center.y, cell * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      if (paintFrame) cancelAnimationFrame(paintFrame);
      paintFrame = requestAnimationFrame(paint);
    }

    // numbered circles
    const fontScale = n >= 7 ? 0.3 : n === 6 ? 0.34 : 0.45;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(cell * fontScale, 10)}px system-ui, sans-serif`;

    for (const [cellKey, value] of Object.entries(board.numbers)) {
      const index = Number(cellKey);
      const center = cellCenter(index, cell);
      ctx.fillStyle = onSurface;
      ctx.beginPath();
      ctx.arc(center.x, center.y, cell * 0.35, 0, Math.PI * 2);
      ctx.fill();

      if (value === 1 || value === Object.keys(board.numbers).length) {
        ctx.strokeStyle = vermilion;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center.x, center.y, cell * 0.35, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = surface;
      ctx.fillText(String(value), center.x, center.y + 1);
    }
  }

  function strokePath(cell) {
    ctx.beginPath();
    path.forEach((index, i) => {
      const center = cellCenter(index, cell);
      if (i === 0) ctx.moveTo(center.x, center.y);
      else ctx.lineTo(center.x, center.y);
    });
    ctx.stroke();
  }

  function alphaHex(alpha) {
    const value = Math.round(Math.min(Math.max(alpha, 0), 1) * 255);
    return value.toString(16).padStart(2, '0');
  }

  render();
  return root;
}

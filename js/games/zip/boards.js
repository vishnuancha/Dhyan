// Board factory: campaign boards come baked in; daily and endless boards are solved
// in a worker (with a deferred main-thread fallback).

import { generate } from './generator.js';
import { mulberry32 } from '../../core/random.js';
import { edgeKey, endlessSpec } from './logic.js';
import { dailySpec, forLevel } from './puzzles.js';

let worker = null;
let workerFailed = false;
let nextId = 1;

function getWorker() {
  if (worker || workerFailed) return worker;
  try {
    worker = new Worker(new URL('./generator-worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('error', () => {
      workerFailed = true;
      worker = null;
    });
  } catch {
    workerFailed = true;
    worker = null;
  }
  return worker;
}

function hydrate(board) {
  return {
    path: board.path,
    numbers: board.numbers,
    walls: new Set(board.walls),
  };
}

async function generateOffThread(spec, seed) {
  const instance = getWorker();
  if (instance) {
    const board = await new Promise((resolve) => {
      const id = nextId++;
      const onMessage = (event) => {
        if (event.data.id !== id) return;
        instance.removeEventListener('message', onMessage);
        resolve(event.data.error ? null : event.data.board);
      };
      instance.addEventListener('message', onMessage);
      instance.postMessage({ id, size: spec.size, checkpoints: spec.checkpoints, walls: spec.walls, seed });
    });
    if (board) return { size: spec.size, ...hydrate(board) };
  }

  // Let the "preparing" state paint before blocking on the solver.
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  return { size: spec.size, ...hydrate(generate(spec.size, spec.checkpoints, spec.walls, mulberry32(seed))) };
}

export function campaignBoard(level) {
  const puzzle = forLevel(level);
  return {
    size: puzzle.size,
    numbers: puzzle.numbers,
    walls: new Set(puzzle.walls.map(([a, b]) => edgeKey(a, b))),
    label: puzzle.label,
    hint: puzzle.hint,
    solution: puzzle.solution,
  };
}

export async function dailyBoard(date, day) {
  const { spec, seed, label, hint } = dailySpec(date, day);
  const board = await generateOffThread(spec, seed);
  return { ...board, label, hint };
}

export async function endlessBoard(runLevel, seed) {
  const board = await generateOffThread(endlessSpec(runLevel), endlessSeed(runLevel, seed));
  return {
    ...board,
    label: `Run ${runLevel}`,
    hint: 'Chain boards back to back. Sizes grow as your run grows.',
  };
}

export function endlessSeed(runLevel, seed) {
  return (seed * 31 + runLevel * 7919) >>> 0;
}

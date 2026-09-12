// ZipLogic port — features/games/zip/ZipLogic.kt.
// Boards use a single row-major index: index = row * size + col.

export function edgeKey(a, b) {
  return a <= b ? `${a}:${b}` : `${b}:${a}`;
}

export function isBlocked(walls, a, b) {
  return walls.has(edgeKey(a, b));
}

export function parFor(cells, checkpoints) {
  return Math.max(cells * 3 + checkpoints * 2, 20);
}

export function starsFor(seconds, par) {
  let stars = 3;
  if (seconds > par) stars -= 1;
  if (seconds > par * 2) stars -= 1;
  return Math.min(Math.max(stars, 1), 3);
}

export function scoreFor(cells, checkpoints, levelWeight, seconds, hintsUsed) {
  return Math.max(
    cells * 25 + checkpoints * 60 + Math.max(levelWeight, 1) * 120 - seconds * 2 - hintsUsed * 30,
    20,
  );
}

/** Seeded date hash — reproduces Kotlin's Long arithmetic with BigInt wraparound. */
export function dailySeed(date) {
  let h = 1125899906842597n;
  for (const char of date) {
    h = BigInt.asIntN(64, 31n * h + BigInt(char.charCodeAt(0)));
  }
  return Number(BigInt.asUintN(32, h));
}

export function finalCell(numbers) {
  let best = null;
  let bestValue = -Infinity;
  for (const [cell, value] of Object.entries(numbers)) {
    if (value > bestValue) {
      bestValue = value;
      best = Number(cell);
    }
  }
  return best;
}

export function highestPlaced(numbers, path) {
  let highest = 0;
  for (const cell of path) {
    const value = numbers[cell];
    if (value !== undefined && value > highest) highest = value;
  }
  return highest;
}

/**
 * One drag step onto `index`. Illegal moves are ignored rather than penalised, and
 * dragging back over the trail rewinds the path to that cell.
 */
export function step(size, walls, numbers, path, index) {
  if (index < 0 || index >= size * size) return null;
  const head = path.length ? path[path.length - 1] : null;
  if (head === null) return null;
  if (index === head) return null;

  const earlierAt = path.indexOf(index);
  if (earlierAt >= 0) return path.slice(0, earlierAt + 1);

  if (!isAdjacent(head, index, size)) return null;
  if (isBlocked(walls, head, index)) return null;

  const here = numbers[index];
  if (here !== undefined && here !== highestPlaced(numbers, path) + 1) return null;

  return [...path, index];
}

export function isAdjacent(a, b, size) {
  const ar = Math.floor(a / size);
  const ac = a % size;
  const br = Math.floor(b / size);
  const bc = b % size;
  return (ar === br && Math.abs(ac - bc) === 1) || (ac === bc && Math.abs(ar - br) === 1);
}

/** A win is one unbroken line filling every cell and ending on the highest circle. */
export function isSolved(size, numbers, path) {
  if (path.length !== size * size) return false;
  const last = finalCell(numbers);
  if (last === null || path[path.length - 1] !== last) return false;
  return Object.keys(numbers).every((cell) => path.includes(Number(cell)));
}

export function commonPrefix(solution, path) {
  let i = 0;
  while (i < path.length && i < solution.length && path[i] === solution[i]) i += 1;
  return i;
}

export function hintCell(solution, path) {
  const i = commonPrefix(solution, path);
  return i < solution.length ? solution[i] : null;
}

export function endlessSpec(runLevel) {
  if (runLevel <= 1) return { size: 5, checkpoints: 5, walls: 1 };
  if (runLevel === 2) return { size: 5, checkpoints: 6, walls: 2 };
  if (runLevel === 3) return { size: 6, checkpoints: 6, walls: 3 };
  if (runLevel === 4) return { size: 6, checkpoints: 7, walls: 3 };
  if (runLevel === 5) return { size: 6, checkpoints: 7, walls: 4 };
  if (runLevel === 6) return { size: 7, checkpoints: 7, walls: 4 };
  if (runLevel <= 9) return { size: 7, checkpoints: 8, walls: 5 };
  if (runLevel <= 14) return { size: 8, checkpoints: 8, walls: 5 };
  return { size: 8, checkpoints: 9, walls: 6 };
}

export function neighborsOf(index, size) {
  const r = Math.floor(index / size);
  const c = index % size;
  const out = [];
  if (r > 0) out.push(index - size);
  if (r < size - 1) out.push(index + size);
  if (c > 0) out.push(index - 1);
  if (c < size - 1) out.push(index + 1);
  return out;
}

export function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
}

export function fmtPar(seconds) {
  return seconds >= 60 ? fmtTime(seconds) : `${seconds}s`;
}

export function starText(stars) {
  if (stars === 3) return '★★★';
  if (stars === 2) return '★★☆';
  if (stars === 1) return '★☆☆';
  return '☆☆☆';
}

// ZipGenerator port — features/games/zip/ZipGenerator.kt.
// Pure functions with an injected seeded RNG so boards are reproducible (and the
// heavy search can run inside a web worker).

import { edgeKey, isBlocked, neighborsOf } from './logic.js';

function shuffledSeeded(array, random) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = random.nextInt(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function snake(size) {
  const path = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < size; c++) path.push(r * size + c);
    } else {
      for (let c = size - 1; c >= 0; c--) path.push(r * size + c);
    }
  }
  return path;
}

function reachableOpen(size, walls, used, from) {
  const seen = new Array(size * size).fill(false);
  seen[from] = true;
  const queue = [from];
  let count = 0;
  while (queue.length) {
    const cur = queue.shift();
    for (const nb of neighborsOf(cur, size)) {
      if (seen[nb]) continue;
      if (isBlocked(walls, cur, nb)) continue;
      seen[nb] = true;
      if (!used[nb]) {
        count += 1;
        queue.push(nb);
      }
    }
  }
  return count;
}

function orderByDegree(size, walls, used, from, candidates) {
  return candidates
    .map((nb) => {
      let degree = 0;
      for (const x of neighborsOf(nb, size)) {
        if (x === from || used[x]) continue;
        if (isBlocked(walls, nb, x)) continue;
        degree += 1;
      }
      return { nb, degree };
    })
    .sort((a, b) => a.degree - b.degree)
    .map((entry) => entry.nb);
}

export function findHamiltonianPath(size, { banned = new Set(), start = null, random, maxNodes = 60000 } = {}) {
  const total = size * size;
  const starts =
    start !== null
      ? [start]
      : shuffledSeeded(
          Array.from({ length: total }, (_, i) => i),
          random,
        ).slice(0, size >= 7 ? 2 : 3);

  for (const s of starts) {
    const used = new Array(total).fill(false);
    const path = [];
    let nodes = 0;
    let over = false;

    const dfs = (head) => {
      if (over) return false;
      nodes += 1;
      if (nodes > maxNodes) {
        over = true;
        return false;
      }
      used[head] = true;
      path.push(head);
      if (path.length === total) return true;

      if (reachableOpen(size, banned, used, head) !== total - path.length) {
        used[head] = false;
        path.pop();
        return false;
      }

      const open = neighborsOf(head, size).filter((nb) => !used[nb] && !isBlocked(banned, head, nb));
      for (const nb of shuffledSeeded(orderByDegree(size, banned, used, head, open), random)) {
        if (dfs(nb)) return true;
        if (over) break;
      }

      used[head] = false;
      path.pop();
      return false;
    };

    if (dfs(s)) return path.slice();
  }
  return null;
}

export function placeNumbers(path, checkpoints, random) {
  const total = path.length;
  const k = Math.min(Math.max(checkpoints, 2), total);
  if (k === 2) return { [path[0]]: 1, [path[total - 1]]: 2 };

  const stepSize = total / (k - 1);
  const indices = new Set([0, total - 1]);
  for (let i = 1; i < k - 1; i++) {
    const base = Math.trunc(i * stepSize);
    const jitter = Math.max(Math.trunc(stepSize / 3), 1);
    const candidate = base + random.nextInt(-jitter, jitter);
    indices.add(Math.min(Math.max(candidate, 1), total - 2));
  }

  let probe = Math.trunc(total / 2);
  while (indices.size < k) {
    indices.add(probe % (total - 1));
    probe += 3;
  }

  const numbers = {};
  [...indices]
    .sort((a, b) => a - b)
    .forEach((idx, order) => {
      numbers[path[idx]] = order + 1;
    });
  return numbers;
}

/** Finds a winning line other than `solution`; `exhausted` flags a spent node budget. */
function findOtherSolution(size, walls, numbers, solution, maxNodes) {
  const total = size * size;
  const start = Number(Object.keys(numbers).find((cell) => numbers[cell] === 1));
  const finalIdx = (() => {
    let best = null;
    let bestValue = -Infinity;
    for (const [cell, value] of Object.entries(numbers)) {
      if (value > bestValue) {
        bestValue = value;
        best = Number(cell);
      }
    }
    return best;
  })();

  const used = new Array(total).fill(false);
  const path = [];
  let nodes = 0;
  let found = null;

  const dfs = (cur, highest) => {
    if (found !== null || nodes > maxNodes) return;
    nodes += 1;
    used[cur] = true;
    path.push(cur);

    if (path.length === total) {
      if (cur === finalIdx && !samePath(path, solution)) found = path.slice();
    } else if (reachableOpen(size, walls, used, cur) === total - path.length) {
      const open = neighborsOf(cur, size).filter(
        (nb) => !used[nb] && !isBlocked(walls, cur, nb) && (numbers[nb] === undefined || numbers[nb] === highest + 1),
      );
      for (const nb of orderByDegree(size, walls, used, cur, open)) {
        dfs(nb, numbers[nb] !== undefined ? numbers[nb] : highest);
        if (found !== null) break;
      }
    }

    path.pop();
    used[cur] = false;
  };

  dfs(start, 1);
  return { path: found, exhausted: nodes > maxNodes };
}

function samePath(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Adds walls until `solution` is the only winning line; null when uniqueness fails. */
function forceUnique(size, numbers, solution, maxWalls, maxNodes) {
  const walls = new Set();
  let added = 0;

  while (added < maxWalls) {
    const alt = findOtherSolution(size, walls, numbers, solution, maxNodes);
    if (alt.exhausted) return null;
    if (alt.path === null) return walls;

    let j = 0;
    while (j < alt.path.length && j < solution.length && alt.path[j] === solution[j]) j += 1;
    if (j === 0 || j >= alt.path.length) return null;

    const key = edgeKey(alt.path[j - 1], alt.path[j]);
    if (walls.has(key)) return null;
    walls.add(key);
    added += 1;
  }

  const final = findOtherSolution(size, walls, numbers, solution, maxNodes);
  return !final.exhausted && final.path === null ? walls : null;
}

export function generateUnique(size, checkpoints, maxWalls, random, maxAttempts = 14, maxNodes = 150000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const path = findHamiltonianPath(size, { random, maxNodes });
    if (!path) continue;
    const numbers = placeNumbers(path, checkpoints, random);
    const walls = forceUnique(size, numbers, path, maxWalls, maxNodes);
    if (!walls) continue;
    return { path, numbers, walls };
  }
  return null;
}

export function wallsFromPath(size, path, count, random) {
  if (count <= 0) return new Set();
  const onPath = new Set();
  for (let i = 0; i < path.length - 1; i++) onPath.add(edgeKey(path[i], path[i + 1]));

  const candidates = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const index = r * size + c;
      if (c < size - 1) {
        const key = edgeKey(index, index + 1);
        if (!onPath.has(key)) candidates.push(key);
      }
      if (r < size - 1) {
        const key = edgeKey(index, index + size);
        if (!onPath.has(key)) candidates.push(key);
      }
    }
  }

  return new Set(shuffledSeeded(candidates, random).slice(0, Math.min(count, candidates.length)));
}

/**
 * Prefers a board with exactly one winning line, escalating checkpoints then walls.
 * Falls back to a merely-valid board so daily/endless boards always generate.
 */
export function generate(size, checkpoints, wallCount, random, maxAttempts = 25, maxNodes = 60000) {
  const uniqueNodes = size >= 7 ? 150000 : 200000;
  const steps = [
    [checkpoints, Math.max(wallCount, 1)],
    [checkpoints + 1, wallCount + 1],
    [checkpoints + 2, wallCount + 2],
  ];

  for (const [numbers, walls] of steps) {
    if (numbers > size * size - 1) continue;
    const board = generateUnique(size, numbers, walls, random, maxAttempts, uniqueNodes);
    if (board) return board;
  }

  const nodes = size >= 7 ? Math.min(maxNodes, 25000) : maxNodes;
  let path = null;
  for (let attempt = 0; attempt < maxAttempts && !path; attempt++) {
    path = findHamiltonianPath(size, { random, maxNodes: nodes });
  }
  if (!path) path = snake(size);

  return {
    path,
    numbers: placeNumbers(path, checkpoints, random),
    walls: wallsFromPath(size, path, wallCount, random),
  };
}

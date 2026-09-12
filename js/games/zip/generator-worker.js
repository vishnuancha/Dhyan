// Runs the Zip solver off the main thread so the "Building a board…" state stays
// responsive. Falls back to synchronous generation when workers are unavailable.

import { generate } from './generator.js';
import { mulberry32 } from '../../core/random.js';

self.onmessage = (event) => {
  const { id, size, checkpoints, walls, seed } = event.data;
  try {
    const board = generate(size, checkpoints, walls, mulberry32(seed));
    self.postMessage({
      id,
      board: {
        path: board.path,
        numbers: board.numbers,
        walls: [...board.walls],
      },
    });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};

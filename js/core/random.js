// Random helpers. mulberry32 gives the Zip puzzles a reproducible seeded stream so
// everyone gets the same daily board (Kotlin's Random isn't reproducible in JS).

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Inclusive integer range, matching Kotlin's IntRange.random(). */
export function randomInt(from, to) {
  return from + Math.floor(Math.random() * (to - from + 1));
}

export function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    nextFloat: next,
    /** Inclusive integer range. */
    nextInt(from, to) {
      return from + Math.floor(next() * (to - from + 1));
    },
    nextPlusMinus(range) {
      return next() < 0.5 ? -range : range;
    },
  };
}

// Port of core/util/DifficultyProgression.kt — every game ships three hand-tuned
// levels the player picks on the intro screen. The day index only decides which
// level is pre-selected, so a new player gets an easy board, a returning one is
// nudged up, and anyone can override it.

export const EASY = 1;
export const MEDIUM = 2;
export const HARD = 3;

/** Picker labels, shown on every game intro. */
export const DIFFICULTY_LABELS = ['Easy', 'Medium', 'Hard'];

export function clampLevel(level) {
  const n = Number.isFinite(level) ? Math.trunc(level) : EASY;
  return Math.min(Math.max(n, EASY), HARD);
}

export function levelName(level) {
  return DIFFICULTY_LABELS[clampLevel(level) - 1];
}

/** Level pre-selected on this many days of play, before any explicit choice. */
export function tierFor(day) {
  if (day <= 30) return EASY;
  if (day <= 120) return MEDIUM;
  return HARD;
}

export function memoryFor(level) {
  switch (clampLevel(level)) {
    case EASY:
      return { level: EASY, gridSize: 4, previewMs: 900 };
    case MEDIUM:
      return { level: MEDIUM, gridSize: 6, previewMs: 750 };
    default:
      return { level: HARD, gridSize: 8, previewMs: 600 };
  }
}

export function stroopFor(level) {
  switch (clampLevel(level)) {
    case EASY:
      return { level: EASY, rounds: 15, colorCount: 4, mismatchRatio: 0.6, reactionDivisor: 50 };
    case MEDIUM:
      return { level: MEDIUM, rounds: 25, colorCount: 5, mismatchRatio: 0.8, reactionDivisor: 40 };
    default:
      return { level: HARD, rounds: 35, colorCount: 6, mismatchRatio: 0.95, reactionDivisor: 25 };
  }
}

export function mathFor(level) {
  switch (clampLevel(level)) {
    case EASY:
      return {
        level: EASY,
        ops: ['ADD', 'SUB', 'MUL', 'DIV'],
        addFrom: 10,
        addTo: 99,
        mulAFrom: 3,
        mulATo: 12,
        mulBFrom: 3,
        mulBTo: 12,
        totalSeconds: 60,
      };
    case MEDIUM:
      return {
        level: MEDIUM,
        ops: ['ADD', 'SUB', 'MUL', 'DIV', 'MIXED'],
        addFrom: 50,
        addTo: 499,
        mulAFrom: 12,
        mulATo: 29,
        mulBFrom: 4,
        mulBTo: 9,
        totalSeconds: 75,
      };
    default:
      return {
        level: HARD,
        ops: ['ADD', 'SUB', 'MUL', 'DIV', 'MIXED', 'PERCENT', 'SQUARE', 'ROOT'],
        addFrom: 120,
        addTo: 999,
        mulAFrom: 13,
        mulATo: 39,
        mulBFrom: 12,
        mulBTo: 19,
        totalSeconds: 90,
      };
  }
}

export function sequenceFor(level) {
  switch (clampLevel(level)) {
    case EASY:
      return { level: EASY, startLength: 3, gridSize: 3, revealMs: 800, gapMs: 550, winLength: 8 };
    case MEDIUM:
      return { level: MEDIUM, startLength: 4, gridSize: 3, revealMs: 600, gapMs: 400, winLength: 10 };
    default:
      return { level: HARD, startLength: 5, gridSize: 4, revealMs: 500, gapMs: 300, winLength: 12 };
  }
}

export function sudokuPhaseFor(level) {
  switch (clampLevel(level)) {
    case EASY:
      return 1;
    case MEDIUM:
      return 2;
    default:
      return 3;
  }
}

export function sudokuMistakesFor(level) {
  switch (clampLevel(level)) {
    case EASY:
      return 4;
    case MEDIUM:
      return 3;
    default:
      return 2;
  }
}

export function zipDailySpec(day) {
  const d = Math.max(day, 1);
  if (d <= 30) return { size: 5, checkpoints: 6, walls: 3 };
  if (d <= 120) return { size: 6, checkpoints: 7, walls: 4 };
  if (d <= 400) return { size: 7, checkpoints: 8, walls: 5 };
  return { size: 8, checkpoints: 9, walls: 6 };
}

// Port of core/util/DifficultyProgression.kt — every game ramps off "day", the
// number of distinct days this game has been played (day 1 = first ever play).

export function tierFor(day) {
  if (day <= 30) return 1;
  if (day <= 120) return 2;
  return 3;
}

export function memoryParams(day) {
  const d = Math.max(day, 1);
  const gridSize = d <= 30 ? 4 : d <= 120 ? 6 : 8;
  const previewMs = Math.max(750 - Math.trunc(d / 4), 450);
  return { gridSize, previewMs, tier: tierFor(d) };
}

export function stroopParams(day) {
  const d = Math.max(day, 1);
  return {
    rounds: Math.min(20 + Math.trunc(d / 60), 40),
    colorCount: d <= 60 ? 4 : d <= 180 ? 5 : 6,
    mismatchRatio: Math.min(0.7 + d * 0.0002, 0.95),
    reactionDivisor: Math.max(50 - Math.trunc(d / 100), 25),
    tier: tierFor(d),
  };
}

export function mathParams(day) {
  const d = Math.max(day, 1);
  return {
    rangeMin: Math.min(1 + Math.trunc(d / 200), 10),
    rangeMax: Math.min(10 + Math.trunc(d / 10), 200),
    multMax: Math.min(9 + Math.trunc(d / 150), 20),
    multPercent: Math.min(33 + Math.trunc(d / 100), 50),
    totalSeconds: Math.max(60 - Math.trunc(d / 90), 40),
    tier: tierFor(d),
  };
}

export function sequenceParams(day) {
  const d = Math.max(day, 1);
  return {
    startLength: Math.min(3 + Math.trunc(d / 200), 6),
    gridSize: d < 180 ? 3 : 4,
    revealMs: Math.max(650 - Math.trunc(d / 5), 300),
    gapMs: Math.max(450 - Math.trunc(d / 8), 200),
    winLength: Math.min(9 + Math.trunc(d / 250), 16),
    tier: tierFor(d),
  };
}

export function sudokuMistakesAllowed(day) {
  const d = Math.max(day, 1);
  if (d <= 60) return 3;
  if (d <= 180) return 2;
  return 1;
}

export function sudokuPhase(day) {
  const d = Math.max(day, 1);
  if (d <= 60) return 1;
  if (d <= 180) return 2;
  return 3;
}

export function zipDailySpec(day) {
  const d = Math.max(day, 1);
  if (d <= 30) return { size: 5, checkpoints: 6, walls: 3 };
  if (d <= 120) return { size: 6, checkpoints: 7, walls: 4 };
  if (d <= 400) return { size: 7, checkpoints: 8, walls: 5 };
  return { size: 8, checkpoints: 9, walls: 6 };
}

/** Difficulty picker is unused by the games, but kept for parity with the app. */
export const DIFFICULTY_LABELS = ['Easy', 'Medium', 'Hard'];

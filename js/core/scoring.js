// Port of core/util/Scoring.kt — XP maths shared by games and habits.

export const HabitGoals = {
  SLEEP_HOURS: 7,
  EXERCISE_MIN: 30,
  WATER_GLASSES: 8,
  READING_MIN: 15,
  MEDITATION_MIN: 10,
  HABIT_COUNT: 5,
};

const XP_PER_LOGGED = 5;
const XP_PER_GOAL = 15;
const DAILY_HABIT_CAP = 100;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function xpFor(rawScore, accuracy, difficulty) {
  const base = clamp(Math.trunc(difficulty), 1, 3) * 10;
  const accBonus = Math.trunc(clamp(accuracy, 0, 1) * 50);
  const scoreBonus = clamp(Math.trunc(rawScore / 10), 0, 50);
  return base + accBonus + scoreBonus;
}

export function nextDifficulty(current, recentAccuracies) {
  const bounded = clamp(Math.trunc(current), 1, 3);
  if (!recentAccuracies || recentAccuracies.length < 2) return bounded;
  const lastTwo = recentAccuracies.slice(-2);
  if (lastTwo.every((a) => a >= 0.8)) return Math.min(bounded + 1, 3);
  if (lastTwo.every((a) => a <= 0.5)) return Math.max(bounded - 1, 1);
  return bounded;
}

export function habitXpDetailed({ sleepHours, exerciseMin, waterGlasses, readingMin, meditationMin }) {
  const logged = [
    sleepHours > 0,
    exerciseMin > 0,
    waterGlasses > 0,
    readingMin > 0,
    meditationMin > 0,
  ].filter(Boolean).length;

  const goalsMet = [
    sleepHours >= HabitGoals.SLEEP_HOURS,
    exerciseMin >= HabitGoals.EXERCISE_MIN,
    waterGlasses >= HabitGoals.WATER_GLASSES,
    readingMin >= HabitGoals.READING_MIN,
    meditationMin >= HabitGoals.MEDITATION_MIN,
  ].filter(Boolean).length;

  const raw = logged * XP_PER_LOGGED + goalsMet * XP_PER_GOAL;
  return {
    loggedCount: logged,
    goalsMet,
    xp: Math.min(raw, DAILY_HABIT_CAP),
    capped: raw > DAILY_HABIT_CAP,
  };
}

export function habitXpFor(entry) {
  return habitXpDetailed(entry).xp;
}

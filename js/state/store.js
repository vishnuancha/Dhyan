// Local-only data layer. Replaces the app's Room tables and DataStore files with
// localStorage, keeping the same shapes so the scoring rules port across unchanged.
// Nothing here ever leaves the browser: no network, no analytics, no identifiers.

import { todayString } from '../core/dates.js';
import { habitXpFor, nextDifficulty, xpFor } from '../core/scoring.js';

const KEYS = {
  results: 'dhyan.results',
  daily: 'dhyan.daily',
  habits: 'dhyan.habits',
  zip: 'dhyan.zip',
  prefs: 'dhyan.prefs',
};

const DEFAULT_PREFS = {
  userName: '',
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  soundOn: true,
  hapticsOn: true,
  audioOn: true,
  /** Difficulty picked per game; a missing entry means "use the suggested level". */
  gameDifficulties: {},
};

const DEFAULT_ZIP = {
  unlockedLevel: 1,
  stars: {},
  lastDaily: '',
  endlessBest: 0,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — keep running in memory */
  }
}

let cache = {
  results: read(KEYS.results, []),
  daily: read(KEYS.daily, {}),
  habits: read(KEYS.habits, {}),
  zip: { ...DEFAULT_ZIP, ...read(KEYS.zip, {}) },
  prefs: { ...DEFAULT_PREFS, ...read(KEYS.prefs, {}) },
};

const blankDaily = () => ({ xp: 0, gamesPlayed: 0, focusMinutes: 0, habitXp: 0 });

const blankHabit = () => ({
  sleepHours: 0,
  exerciseMin: 0,
  waterGlasses: 0,
  readingMin: 0,
  meditationMin: 0,
  focusSessions: 0,
});

/* ---------- preferences ---------- */

export function prefs() {
  return { ...cache.prefs };
}

export function updatePrefs(patch) {
  cache.prefs = { ...cache.prefs, ...patch };
  write(KEYS.prefs, cache.prefs);
  return prefs();
}

/** Difficulty the player chose for a game, or null to fall back to the suggested level. */
export function gameDifficultyFor(gameType) {
  const level = (cache.prefs.gameDifficulties || {})[gameType];
  return Number.isFinite(level) ? level : null;
}

export function setGameDifficulty(gameType, level) {
  updatePrefs({ gameDifficulties: { ...(cache.prefs.gameDifficulties || {}), [gameType]: level } });
}

/* ---------- game results ---------- */

export function results() {
  return cache.results.slice().sort((a, b) => b.playedAt - a.playedAt);
}

export function recentResults(limit = 50) {
  return results().slice(0, limit);
}

export function bestFor(gameType) {
  const mine = cache.results.filter((r) => r.gameType === gameType);
  if (!mine.length) return null;
  return mine.reduce((best, r) => (r.score > best.score ? r : best));
}

export function bestPerGame() {
  const map = new Map();
  for (const r of cache.results) {
    const current = map.get(r.gameType);
    if (!current || r.score > current.best) map.set(r.gameType, { gameType: r.gameType, best: r.score });
  }
  return [...map.values()].sort((a, b) => a.gameType.localeCompare(b.gameType));
}

export function recentAccuracies(gameType, limit = 5) {
  return results()
    .filter((r) => r.gameType === gameType)
    .slice(0, limit)
    .map((r) => r.accuracy);
}

export function dayIndexFor(gameType) {
  const days = new Set();
  for (const r of cache.results) {
    if (r.gameType !== gameType) continue;
    days.add(new Date(r.playedAt).toLocaleDateString('en-CA'));
  }
  return days.size + 1;
}

export function totalXp() {
  const gameXp = cache.results.reduce((sum, r) => sum + (r.xp || 0), 0);
  const habitXp = Object.values(cache.daily).reduce((sum, d) => sum + (d.habitXp || 0), 0);
  return gameXp + habitXp;
}

/** Mirrors GameRepository.save — returns what the result card needs. */
export function saveResult({ gameType, score, durationMs, accuracy, difficulty }) {
  const previousBest = bestFor(gameType);
  const xp = xpFor(score, accuracy, difficulty);
  const playedAt = Date.now();

  cache.results.push({
    id: cache.results.length ? Math.max(...cache.results.map((r) => r.id)) + 1 : 1,
    gameType,
    score,
    durationMs,
    accuracy,
    difficulty,
    xp,
    playedAt,
  });
  write(KEYS.results, cache.results);

  const date = todayString();
  const stat = cache.daily[date] || blankDaily();
  stat.xp += xp;
  stat.gamesPlayed += 1;
  cache.daily[date] = stat;
  write(KEYS.daily, cache.daily);

  const accuracies = recentAccuracies(gameType);
  return {
    xp,
    isBest: previousBest === null || score > previousBest.score,
    suggestedDifficulty: nextDifficulty(difficulty, accuracies),
  };
}

/* ---------- daily stats ---------- */

export function dailyFor(date) {
  return cache.daily[date] ? { ...cache.daily[date] } : null;
}

export function dailyRecent(limit = 30) {
  return Object.entries(cache.daily)
    .map(([date, stat]) => ({ date, ...stat }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function addFocusMinutes(minutes) {
  if (minutes <= 0) return;
  const date = todayString();
  const stat = cache.daily[date] || blankDaily();
  stat.focusMinutes += minutes;
  cache.daily[date] = stat;
  write(KEYS.daily, cache.daily);
}

export function activeDates() {
  const dates = new Set();
  for (const [date, stat] of Object.entries(cache.daily)) {
    if (stat.gamesPlayed > 0 || stat.focusMinutes > 0) dates.add(date);
  }
  for (const date of Object.keys(cache.habits)) dates.add(date);
  return dates;
}

/* ---------- habits ---------- */

export function habitFor(date) {
  return cache.habits[date] ? { ...cache.habits[date] } : null;
}

export function habitRecent(limit = 7) {
  return Object.entries(cache.habits)
    .map(([date, entry]) => ({ date, ...entry }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function saveHabit(date, entry) {
  const record = { ...blankHabit(), ...entry, date };
  cache.habits[date] = record;
  write(KEYS.habits, cache.habits);

  const xp = habitXpFor(record);
  const stat = cache.daily[date] || blankDaily();
  stat.habitXp = xp;
  cache.daily[date] = stat;
  write(KEYS.daily, cache.daily);
  return xp;
}

export function addMeditationMinutes(minutes) {
  if (minutes <= 0) return;
  const date = todayString();
  const existing = habitFor(date) || blankHabit();
  existing.meditationMin += minutes;
  saveHabit(date, existing);
}

/* ---------- zip progress ---------- */

export function zipProgress() {
  return { ...cache.zip, stars: { ...cache.zip.stars } };
}

export function recordZipLevelWin(level, stars) {
  const zip = cache.zip;
  zip.unlockedLevel = Math.max(zip.unlockedLevel || 1, level + 1);
  const bounded = Math.min(Math.max(stars, 1), 3);
  zip.stars[level] = Math.max(zip.stars[level] || 0, bounded);
  write(KEYS.zip, zip);
}

export function recordZipDaily(date) {
  cache.zip.lastDaily = date;
  write(KEYS.zip, cache.zip);
}

export function recordZipEndless(run) {
  if (run <= 0) return;
  cache.zip.endlessBest = Math.max(cache.zip.endlessBest || 0, run);
  write(KEYS.zip, cache.zip);
}

/* ---------- maintenance ---------- */

export function storageKeys() {
  return Object.values(KEYS);
}

export function resetAll() {
  for (const key of Object.values(KEYS)) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  cache = {
    results: [],
    daily: {},
    habits: {},
    zip: { ...DEFAULT_ZIP },
    prefs: { ...DEFAULT_PREFS },
  };
}

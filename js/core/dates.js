// Date helpers — port of core/util/TimeUtils.kt (local dates, ISO yyyy-mm-dd).

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayString() {
  return toDateString(new Date());
}

export function daysAgoString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Number(daysAgo));
  return toDateString(d);
}

export function shiftDate(dateString, days) {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function lastNDates(n, endString = todayString()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftDate(endString, -i));
  return out;
}

export function weekdayLetter(dateString) {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dateString.slice(-2);
  return date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1).toUpperCase();
}

export function longDate(dateString) {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function msToSeconds(ms) {
  return Math.floor(ms / 1000);
}

/** Consecutive-day streak ending today (or yesterday) — Streak.count in TimeUtils.kt. */
export function streakCount(activeDates, today = todayString()) {
  let cursor = today;
  if (!activeDates.has(cursor)) {
    cursor = shiftDate(cursor, -1);
    if (!activeDates.has(cursor)) return 0;
  }
  let streak = 0;
  while (activeDates.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

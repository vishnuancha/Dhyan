// Zip board specs — features/games/zip/ZipPuzzles.kt.

import { LEVELS } from '../../data/zip-campaign.js';
import { dailySeed } from './logic.js';
import { zipDailySpec } from '../../core/difficulty.js';

export const CAMPAIGN_COUNT = LEVELS.length;

export function forLevel(level) {
  return LEVELS[(Math.max(level, 1) - 1) % LEVELS.length];
}

export function dailySpec(date, day) {
  const spec = zipDailySpec(Math.max(day, 1));
  return {
    spec: { size: spec.size, checkpoints: spec.checkpoints, walls: spec.walls },
    seed: dailySeed(`${date}#${Math.max(day, 1)}`),
    label: `Daily ${date}`,
    hint: 'One fresh board a day. Same puzzle for everyone today.',
  };
}

// Game catalogue — GameType.kt plus the GAME_META table from HomeScreen.kt.

export const GAMES = [
  {
    type: 'MEMORY',
    title: 'Memory Match',
    blurb: 'Pairs · visual recall',
    path: 'games/memory',
    icon: 'grid',
    accent: 'var(--game-memory)',
  },
  {
    type: 'STROOP',
    title: 'Stroop Test',
    blurb: 'Attention · reaction',
    path: 'games/stroop',
    icon: 'palette',
    accent: 'var(--game-stroop)',
  },
  {
    type: 'MATH',
    title: 'Math Sprint',
    blurb: 'Speed · arithmetic',
    path: 'games/math',
    icon: 'calculate',
    accent: 'var(--game-math)',
  },
  {
    type: 'SEQUENCE',
    title: 'Sequence Recall',
    blurb: 'Working memory',
    path: 'games/sequence',
    icon: 'repeat',
    accent: 'var(--game-sequence)',
  },
  {
    type: 'SUDOKU',
    title: 'Sudoku',
    blurb: 'Logic · grows with you',
    path: 'games/sudoku',
    icon: 'puzzle',
    accent: 'var(--game-sudoku)',
  },
  {
    type: 'ZIP',
    title: 'Zip',
    blurb: 'Campaign · daily · endless',
    path: 'games/zip',
    icon: 'route',
    accent: 'var(--game-zip)',
  },
];

export function gameByType(type) {
  return GAMES.find((g) => g.type === type) || { ...GAMES[0], title: type };
}

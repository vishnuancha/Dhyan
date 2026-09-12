// Sudoku puzzle data — verbatim from features/games/sudoku/SudokuPuzzles.kt.

function parse(puzzle) {
  const givens = puzzle.givens.join('').split('').map(Number);
  const solution = puzzle.solution.join('').split('').map(Number);
  return { size: puzzle.size, boxRows: puzzle.boxRows, boxCols: puzzle.boxCols, givens, solution };
}

const EASY_6X6 = [
  {
    size: 6,
    boxRows: 2,
    boxCols: 3,
    givens: ['103056', '050123', '230064', '504201', '012640', '640302'],
    solution: ['123456', '456123', '231564', '564231', '312645', '645312'],
  },
  {
    size: 6,
    boxRows: 2,
    boxCols: 3,
    givens: ['402300', '030120', '200450', '300200', '103600', '604030'],
    solution: ['412365', '536124', '261453', '345216', '153642', '624531'],
  },
].map(parse);

const EASY_9X9 = [
  {
    size: 9,
    boxRows: 3,
    boxCols: 3,
    givens: ['530070000', '600195000', '098000060', '800060003', '400803001', '700020006', '060000280', '000419005', '000080079'],
    solution: ['534678912', '672195348', '198342567', '859761423', '426853791', '713924856', '961537284', '287419635', '345286179'],
  },
].map(parse);

function relabel(puzzle, map) {
  return {
    ...puzzle,
    givens: puzzle.givens.map((v) => (v === 0 ? 0 : map(v))),
    solution: puzzle.solution.map(map),
  };
}

const HARD_9X9 = [relabel(EASY_9X9[0], (v) => 10 - v)];

export function sudokuForDifficulty(difficulty) {
  if (difficulty <= 1) return EASY_6X6[Math.floor(Math.random() * EASY_6X6.length)];
  if (difficulty === 2) return EASY_9X9[Math.floor(Math.random() * EASY_9X9.length)];
  return HARD_9X9[Math.floor(Math.random() * HARD_9X9.length)];
}

// Port of core/util/MathProblems.kt — builds the arithmetic questions for Math
// Sprint from the difficulty spec. Every answer is a whole number.

import { pick, randomInt } from './random.js';

const PERCENT_VALUES = [5, 10, 15, 20, 25, 50, 75];

export function nextMathProblem(params) {
  switch (pick(params.ops)) {
    case 'ADD': {
      const a = randomInt(params.addFrom, params.addTo);
      const b = randomInt(params.addFrom, params.addTo);
      return { question: `${a} + ${b}`, answer: a + b };
    }
    case 'SUB': {
      const a = randomInt(params.addFrom, params.addTo);
      let b = randomInt(params.addFrom, params.addTo);
      if (a === b) b = b > params.addFrom ? b - 1 : b + 1;
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      return { question: `${hi} − ${lo}`, answer: hi - lo };
    }
    case 'MUL': {
      const a = randomInt(params.mulAFrom, params.mulATo);
      const b = randomInt(params.mulBFrom, params.mulBTo);
      return { question: `${a} × ${b}`, answer: a * b };
    }
    case 'DIV': {
      const a = randomInt(params.mulAFrom, params.mulATo);
      const b = randomInt(params.mulBFrom, params.mulBTo);
      return Math.random() < 0.5
        ? { question: `${a * b} ÷ ${a}`, answer: b }
        : { question: `${a * b} ÷ ${b}`, answer: a };
    }
    case 'MIXED':
      return mixed(params);
    case 'PERCENT': {
      const percent = pick(PERCENT_VALUES);
      const base = 20 * randomInt(1, 20);
      return { question: `${percent}% of ${base}`, answer: (percent * base) / 100 };
    }
    case 'SQUARE': {
      const n = randomInt(12, 19);
      return { question: `${n}²`, answer: n * n };
    }
    default: {
      const n = randomInt(11, 19);
      return { question: `√${n * n}`, answer: n };
    }
  }
}

/** Order-of-operations questions: the multiplication always resolves first. */
function mixed(params) {
  const x = randomInt(3, 12);
  const y = randomInt(3, 12);
  const product = x * y;
  const roll = randomInt(0, 2);

  if (roll === 0) {
    const base = randomInt(params.addFrom, params.addTo);
    return { question: `${base} + ${x} × ${y}`, answer: base + product };
  }
  if (roll === 1) {
    const base = randomInt(params.addFrom, params.addTo);
    return { question: `${x} × ${y} + ${base}`, answer: product + base };
  }

  const c = randomInt(5, 59);
  if (product > c) return { question: `${x} × ${y} − ${c}`, answer: product - c };
  const base = randomInt(params.addFrom, params.addTo);
  return { question: `${base} + ${x} × ${y}`, answer: base + product };
}

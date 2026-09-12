// Stroop Test — port of features/games/stroop/StroopViewModel.kt + StroopScreen.kt.

import {
  append,
  boardSize,
  button,
  clear,
  gameResultCard,
  gameScreen,
  gameScaffold,
  h,
  progressBar,
} from '../core/ui.js';
import { feedback } from '../core/feedback.js';
import { stroopParams } from '../core/difficulty.js';
import { pick, shuffle } from '../core/random.js';
import { dayIndexFor, saveResult } from '../state/store.js';
import { back } from '../router.js';

const PALETTE = [
  ['RED', '#D32F2F'],
  ['BLUE', '#1976D2'],
  ['GREEN', '#388E3C'],
  ['YELLOW', '#F9A825'],
  ['PURPLE', '#7B1FA2'],
  ['ORANGE', '#EF6C00'],
];

export function stroopScreen() {
  const day = dayIndexFor('STROOP');
  const params = stroopParams(day);
  const palette = PALETTE.slice(0, params.colorCount);

  let phase = 'intro';
  let round = 0;
  let word = '';
  let ink = PALETTE[0];
  let options = [];
  let correctLabel = '';
  let correctCount = 0;
  let reactions = [];
  let roundStart = 0;
  let startedAt = 0;
  let lastCorrect = null;
  let lastWas = '';
  let save = null;
  let result = null;

  const body = h('div');
  const root = gameScreen({ title: 'Stroop Test', accent: 'var(--game-stroop)', onBack: () => back('') }, body);

  function draw() {
    clear(body);
    if (phase === 'intro') append(body, intro());
    else if (phase === 'playing') append(body, playing());
    else append(body, done());
  }

  function intro() {
    return gameScaffold({
      title: 'Stroop Test',
      subtitle: `Tap the INK color, not the word. · Day ${day}`,
      startLabel: `Start (${params.rounds} rounds)`,
      instructionLines: [
        'Example: the word RED shown in blue ink → tap BLUE.',
        'Score rewards speed and accuracy.',
      ],
      onStart: start,
    });
  }

  function start() {
    round = 0;
    correctCount = 0;
    reactions = [];
    lastCorrect = null;
    startedAt = Date.now();
    phase = 'playing';
    nextRound(true);
  }

  function nextRound(clearFeedback) {
    if (clearFeedback) lastCorrect = null;
    if (round >= params.rounds) {
      finish();
      return;
    }
    round += 1;

    ink = pick(palette);
    let name = pick(palette)[0];
    if (name === ink[0] && Math.random() < params.mismatchRatio) {
      name = pick(palette.filter((p) => p[0] !== ink[0]))[0];
    }
    word = name;
    correctLabel = ink[0];
    options = shuffle(palette.map(([label, color]) => ({ label, color })));
    roundStart = Date.now();
    draw();
  }

  function answer(label) {
    reactions.push(Date.now() - roundStart);
    const right = label === correctLabel;
    if (right) correctCount += 1;
    else lastWas = correctLabel;
    lastCorrect = right;
    if (right) feedback.correct();
    else feedback.wrong();
    nextRound(false);
  }

  function finish() {
    const avg = reactions.length ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0;
    const score = Math.max(correctCount * 100 - Math.max(Math.trunc(avg / params.reactionDivisor), 0), 0);
    save = saveResult({
      gameType: 'STROOP',
      score,
      durationMs: Date.now() - startedAt,
      accuracy: correctCount / params.rounds,
      difficulty: params.tier,
    });
    result = { score, correct: correctCount, avg };
    phase = 'done';
    draw();
  }

  function playing() {
    const optionList = h('div', { class: 'game-stack' });
    options.forEach((option) => {
      optionList.appendChild(button({ label: option.label, block: true, onClick: () => answer(option.label) }));
    });

    const tone = lastCorrect === true ? 'feedback--ok' : lastCorrect === false ? 'feedback--bad' : '';

    return h(
      'div',
      { class: 'game-stack' },
      h('div', { class: 'hud-row' }, h('span', { class: 'value' }, `Round ${round}/${params.rounds}`)),
      progressBar({ value: round, total: params.rounds }),
      h('div', { class: 'question', style: { color: ink[1] } }, word),
      h('p', { class: 'caption', style: { textAlign: 'center' } }, 'Tap the ink color'),
      boardSize(480, optionList),
      h(
        'div',
        { class: `feedback ${tone}` },
        lastCorrect === true ? 'Correct!' : lastCorrect === false ? `Missed — was ${lastWas}` : '',
      ),
    );
  }

  function done() {
    return gameResultCard({
      title: 'Stroop complete',
      rows: [
        ['Score', String(result.score)],
        ['Correct', `${result.correct}/${params.rounds}`],
        ['Avg reaction', `${result.avg}ms`],
        ['XP earned', `+${save.xp}`],
      ],
      isBest: save.isBest,
      onPlayAgain: start,
      onExit: () => back(''),
    });
  }

  draw();
  return root;
}

// Guided session library — port of core/meditation/MeditationLibrary.kt.

const step = (text, seconds, phase = null) => ({ text, seconds, phase });

export const SESSIONS = [
  {
    id: 'box',
    title: 'Box Breathing',
    subtitle: 'Even 4-4-4-4 rhythm to steady focus',
    minutes: 3,
    accent: 'var(--blue)',
    icon: 'air',
    audio: './audio/breath_444.mp3',
    loop: [
      step('Breathe in…', 4, 'INHALE'),
      step('Hold…', 4, 'HOLD'),
      step('Breathe out…', 4, 'EXHALE'),
      step('Hold…', 4, 'REST'),
    ],
  },
  {
    id: '478',
    title: '4-7-8 Relaxing Breath',
    subtitle: 'Long exhale to calm the nervous system',
    minutes: 3,
    accent: 'var(--violet)',
    icon: 'waves',
    audio: './audio/breath_478.mp3',
    loop: [
      step('Breathe in…', 4, 'INHALE'),
      step('Hold…', 7, 'HOLD'),
      step('Breathe out slowly…', 8, 'EXHALE'),
    ],
  },
  {
    id: 'coherent',
    title: 'Coherent Breathing',
    subtitle: 'Smooth 5-5 balance for heart and mind',
    minutes: 5,
    accent: 'var(--teal)',
    icon: 'leaf',
    audio: './audio/breath_55.mp3',
    loop: [step('Breathe in…', 5, 'INHALE'), step('Breathe out…', 5, 'EXHALE')],
  },
  {
    id: 'bodyscan',
    title: 'Body Scan',
    subtitle: 'Travel attention from feet to head',
    minutes: 5,
    accent: 'var(--green)',
    icon: 'body',
    audio: './audio/body_scan.mp3',
    script: [
      step('Get comfortable, close your eyes if you like.', 20),
      step('Notice your feet. Let them soften.', 40),
      step('Relax your calves and knees.', 40),
      step('Soften your thighs and hips.', 40),
      step('Feel your belly rise and fall.', 40),
      step('Release your shoulders and arms.', 40),
      step('Relax your jaw, eyes and forehead.', 40),
      step('Rest with your whole body at ease.', 60),
    ],
  },
  {
    id: 'pause',
    title: 'Mindful Pause',
    subtitle: 'Three minutes to reset between tasks',
    minutes: 3,
    accent: 'var(--amber)',
    icon: 'meditate',
    audio: './audio/mindful_pause.mp3',
    script: [
      step('Sit tall and take one deep breath.', 15, 'INHALE'),
      step('Notice three sounds around you.', 40),
      step('Notice the feeling of your breath at the nose.', 40),
      step('When thoughts come, let them pass like clouds.', 40),
      step('Return to the breath. In… and out…', 30, 'INHALE'),
      step('One more slow exhale.', 15, 'EXHALE'),
    ],
  },
  {
    id: 'sleep',
    title: 'Sleep Wind-Down',
    subtitle: 'Slow cues to drift toward sleep',
    minutes: 10,
    accent: 'var(--indigo)',
    icon: 'moon',
    audio: './audio/sleep_wind_down.mp3',
    script: [
      step('Lie down and let your body feel heavy.', 75),
      step('Breathe in gently…', 6, 'INHALE'),
      step('…and let the breath go.', 8, 'EXHALE'),
      step('Soften your forehead and jaw.', 75),
      step('Let your shoulders sink into the bed.', 90),
      step('Breathe in gently…', 6, 'INHALE'),
      step('…and let the breath go.', 8, 'EXHALE'),
      step('Nothing to do now. Just rest.', 120),
      step('Breathe in gently…', 6, 'INHALE'),
      step('…and let the breath go.', 8, 'EXHALE'),
      step('Drift.', 180),
    ],
  },
];

export function sessionById(id) {
  return SESSIONS.find((session) => session.id === id) || null;
}

export function stepsOf(session) {
  return session.loop || session.script || [];
}

export function totalSeconds(session, minutes) {
  if (session.loop) return Math.max(minutes, 1) * 60;
  return stepsOf(session).reduce((sum, s) => sum + s.seconds, 0);
}

export function nextStepIndex(session, index, secondsLeft) {
  const steps = stepsOf(session);
  if (!steps.length) return null;
  const next = index + 1;
  if (next < steps.length) return next;
  if (session.loop && secondsLeft > 0) return 0;
  return null;
}

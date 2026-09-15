// Tiny DOM helpers plus the shared components from core/ui/components/Components.kt.

import { DIFFICULTY_LABELS } from './difficulty.js';
import { icon } from './icons.js';

export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;

    if (key === 'class' || key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }

  append(node, children);
  return node;
}

export function append(parent, children) {
  const list = Array.isArray(children) ? children.flat(Infinity) : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- shared components ---------- */

export function iconButton(name, { label, accent, onClick } = {}) {
  return h(
    'button',
    {
      class: `icon-btn${accent ? ' icon-btn--accent' : ''}`,
      type: 'button',
      'aria-label': label,
      onclick: onClick,
    },
    icon(name),
  );
}

export function topBar({ title, accent, onBack }) {
  return h(
    'div',
    { class: 'top-bar', style: accent ? { '--accent': accent } : {} },
    onBack ? iconButton('back', { label: 'Back', accent: Boolean(accent), onClick: onBack }) : null,
    h('h1', { class: 'top-bar__title' }, title),
  );
}

/** Game/player wrapper: sticky top bar plus a scrolling body. */
export function gameScreen({ title, accent, onBack, style }, ...children) {
  return h(
    'div',
    { class: 'screen', style: { '--accent': accent, ...(style || {}) } },
    topBar({ title, accent, onBack }),
    h('div', { class: 'screen__body' }, ...children),
  );
}

/** Tab screen: centred column capped at 720px, like TabScreen in AdaptiveContainers.kt. */
export function tabScreen({ title, subtitle, brush = 'games' }, ...children) {
  return h(
    'div',
    { class: `tab-screen brush-${brush}` },
    h(
      'div',
      { class: 'tab-header' },
      h('h1', {}, title),
      subtitle ? h('p', {}, subtitle) : null,
    ),
    ...children,
  );
}

export function card(...children) {
  return h('div', { class: 'card' }, ...children);
}

export function emptyState({ icon: iconName = 'sparkle', title, body, accent = 'var(--violet)', actionLabel, onAction }) {
  return h(
    'div',
    { class: 'empty', style: { '--accent': accent } },
    icon(iconName),
    h('strong', {}, title),
    h('p', {}, body),
    actionLabel && onAction ? button({ label: actionLabel, block: true, onClick: onAction }) : null,
  );
}

export function statCard({ title, value, accent = 'var(--violet)' }) {
  return h(
    'div',
    { class: 'stat-card', style: { '--accent': accent }, role: 'group', 'aria-label': `${title}: ${value}` },
    h('div', { class: 'stat-card__label' }, title),
    h('div', { class: 'stat-card__value' }, value),
  );
}

export function button({ label, onClick, variant = 'filled', block, large, flex, disabled, ariaLabel }) {
  const classes = ['btn'];
  if (variant === 'outlined') classes.push('btn--outlined');
  if (variant === 'text') classes.push('btn--text');
  if (variant === 'tonal') classes.push('btn--tonal');
  if (block) classes.push('btn--block');
  if (large) classes.push('btn--lg');
  if (flex) classes.push('btn--flex');
  return h(
    'button',
    {
      class: classes.join(' '),
      type: 'button',
      onclick: onClick,
      disabled: disabled || false,
      'aria-label': ariaLabel,
    },
    label,
  );
}

export function progressBar({ value, total, accent = 'var(--primary)' }) {
  const pct = Math.min(Math.max(value / Math.max(total, 1), 0), 1) * 100;
  return h(
    'div',
    { class: 'progress', style: { '--accent': accent }, role: 'progressbar', 'aria-valuenow': Math.round(pct) },
    h('div', { class: 'progress__bar', style: { width: `${pct}%` } }),
  );
}

export function resultRow(label, value) {
  return h('div', { class: 'hud-row' }, h('span', { class: 'label' }, label), h('span', { class: 'value' }, value));
}

export function difficultyPicker({ selected, onSelect, labels = DIFFICULTY_LABELS }) {
  const row = h('div', { class: 'difficulty', role: 'group', 'aria-label': 'Difficulty' });
  labels.forEach((label, index) => {
    const level = index + 1;
    const active = level === selected;
    row.appendChild(
      button({
        label,
        variant: active ? 'filled' : 'outlined',
        onClick: () => onSelect(level),
        ariaLabel: `${label} difficulty${active ? ', selected' : ''}`,
      }),
    );
  });
  return row;
}

export function gameScaffold({
  title,
  subtitle,
  instructionLines = [],
  startLabel = 'Start',
  onStart,
  difficulty = null,
  onDifficultyChange = null,
}) {
  return h(
    'div',
    { class: 'card' },
    h('h2', { class: 'card__title' }, title),
    h('p', { class: 'card__note' }, subtitle),
    h('hr', { class: 'divider' }),
    difficulty && onDifficultyChange
      ? h(
          'div',
          { class: 'difficulty-block' },
          h('span', { class: 'caption' }, 'Difficulty'),
          difficultyPicker({ selected: difficulty, onSelect: onDifficultyChange }),
        )
      : null,
    h(
      'div',
      { class: 'card' },
      ...instructionLines.map((line) => (typeof line === 'string' ? h('p', {}, line) : line)),
    ),
    button({ label: startLabel, block: true, large: true, onClick: onStart }),
  );
}

export function gameResultCard({ title, rows, isBest, onPlayAgain, onExit }) {
  return h(
    'div',
    { class: `card${isBest ? ' card--best' : ''}` },
    h('h2', { class: 'card__title' }, title),
    isBest ? h('span', { class: 'chip chip--amber' }, 'New best!') : null,
    ...rows.map(([label, value]) => resultRow(label, value)),
    h(
      'div',
      { class: 'card__row' },
      button({ label: 'Play again', flex: true, onClick: onPlayAgain }),
      button({ label: 'Done', variant: 'outlined', flex: true, onClick: onExit }),
    ),
  );
}

export function boardSize(width, ...children) {
  return h('div', { class: 'board-size' }, h('div', { class: `w-${width}` }, ...children));
}

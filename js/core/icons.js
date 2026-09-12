// Inline SVG icon set (24x24, Material-flavoured). No icon font, no network requests.

const PATHS = {
  games: 'M12 3 3 10v11h6v-7h6v7h6V10z',
  meditate:
    'M12 3.2a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zM11 9h2l1.2 4.4H19l-1 2h-3.6L13 21h-3l1.6-5.6L7 17.6l-1.2-2 5.2-3.4z',
  habits: 'M3 5h2.2v2.2H3zm0 6h2.2v2.2H3zm0 6h2.2v2.2H3zM7.5 5H21v2.2H7.5zm0 6H21v2.2H7.5zm0 6H21v2.2H7.5z',
  stats: 'M4 20h3.2V10H4zm6.4 0h3.2V4h-3.2zm6.4 0H20v-7h-3.2z',
  settings:
    'M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2zm0 5.4a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zM20.4 13l1.7-1.2-1.6-3-2 .6a7.9 7.9 0 0 0-1.7-1L16.4 6h-3.5l-.4 2.4c-.6.2-1.2.6-1.7 1l-2-.6-1.6 3L8.9 13a8 8 0 0 0 0 2l-1.7 1.2 1.6 3 2-.6c.5.4 1.1.8 1.7 1l.4 2.4h3.5l.4-2.4c.6-.2 1.2-.6 1.7-1l2 .6 1.6-3L20.4 13a8 8 0 0 0 0-2z',
  back: 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z',
  chevron: 'M9.5 6 15.5 12l-6 6-1.4-1.4L12.7 12 8.1 7.4z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 11H7v-2h4V6h2z',
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zm6 0h4v14h-4z',
  music: 'M12 3v10.6A4 4 0 1 0 14 17V7h4V3z',
  musicOff:
    'M4.3 3 3 4.3 9.5 10.8v2.8A4 4 0 1 0 11.9 18v-2.5L18 21.6l1.3-1.3zM12 3h6v4h-4.2l-1.8-1.8z',
  trophy: 'M7 4h10v3.2a5 5 0 0 1-10 0zM5 5.2h2v2A3 3 0 0 1 5 5.2zm12 0h2a3 3 0 0 1-2 2zM11 12.4h2v3.4h3.2V18H7.8v-2.2H11z',
  add: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  remove: 'M5 11h14v2H5z',
  check: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.8 15L5 11.8l1.4-1.4 3.8 3.8 7-7L18.6 8.6z',
  erase: 'M22 6H8l-7 6 7 6h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-3.2 9.2L17.4 16.6 15 14.2l-2.4 2.4-1.4-1.4 2.4-2.4-2.4-2.4 1.4-1.4L15 11.4l2.4-2.4 1.4 1.4-2.4 2.4z',
  grid: 'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z',
  palette:
    'M12 3a9 9 0 0 0 0 18c1.6 0 2.1-1.3 1.2-2.3-.9-1-.4-2.4 1.1-2.4H16a5 5 0 0 0 5-5c0-4.6-4-8.3-9-8.3zM7.4 12.4a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2zm3.1-4.2a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2zm4 0a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2zm3.1 4.2a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2z',
  calculate: 'M5 3h14v18H5zm2 3v3h10V6zm0 6v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2zm-8 4v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2z',
  repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z',
  puzzle:
    'M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.7 2.7 0 0 1 0 5.4H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 0 1 5.4 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z',
  route:
    'M6.5 3a3.5 3.5 0 0 0-1 6.9v4.2A3.5 3.5 0 1 0 8 17.9V9.9A3.5 3.5 0 0 0 6.5 3zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0 11a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM17.5 3a3.5 3.5 0 0 0-3.4 4.3l-3.7 4.6a3.5 3.5 0 1 0 4.6 1.2l3.7-4.6A3.5 3.5 0 0 0 17.5 3zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  air: 'M3 8h9a3 3 0 1 0-3-3H7a5 5 0 1 1 5 5H3zm0 4h13a3 3 0 1 1-3 3h-2a5 5 0 1 0 5-5H3z',
  waves: 'M2 12c2.2 0 3.3-2 5.5-2S10.8 12 13 12s3.3-2 5.5-2S21.8 12 22 12v2.2c-2.2 0-3.3-2-5.5-2s-3.3 2-5.5 2-3.3-2-5.5-2S4.2 14.2 2 14.2z',
  leaf: 'M12 3C7 6 4 9.1 4 13a8 8 0 0 0 16 0c0-3.9-3-7-8-10zm0 17a6 6 0 0 1-6-6c0-2.4 1.9-4.8 6-7.6 4.1 2.8 6 5.2 6 7.6a6 6 0 0 1-6 6z',
  body: 'M12 3.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM7.8 9h8.4v2.2h-3.1v2.5l2.2 7.3h-2.2l-1.1-3.9-1.1 3.9H8.7l2.2-7.3v-2.5H7.8z',
  moon: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z',
  lock: 'M12 3a4 4 0 0 0-4 4v2H6v12h12V9h-2V7a4 4 0 0 0-4-4zm-2 6V7a2 2 0 1 1 4 0v2z',
  sparkle: 'M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9z',
};

export function iconPath(name) {
  return PATHS[name] || PATHS.sparkle;
}

export function icon(name, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', className ? `icon ${className}` : 'icon');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', iconPath(name));
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}

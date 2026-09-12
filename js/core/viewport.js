// Tracks the on-screen keyboard so a focused input can stay visible above it.
// Exposed as the --keyboard-h custom property: iOS overlays the keyboard on the
// page (so we need the offset), Android resizes the viewport (so it is 0 there).

export function trackKeyboard() {
  const viewport = window.visualViewport;
  if (!viewport) return;

  const apply = () => {
    const hidden = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    document.documentElement.style.setProperty('--keyboard-h', `${Math.round(hidden)}px`);
  };

  viewport.addEventListener('resize', apply);
  viewport.addEventListener('scroll', apply);
  window.addEventListener('orientationchange', apply);
  apply();
}

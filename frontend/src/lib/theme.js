import { FOUNDATION_TOKENS, TOKENS } from '@/styles/tokens.js';

const KEY = 'accessfix.theme';
const MODES = ['system', 'light', 'dark'];

export function readTheme() {
  const fromQuery = new URLSearchParams(window.location.search).get('theme');
  if (MODES.includes(fromQuery)) return fromQuery;
  const stored = window.localStorage.getItem(KEY);
  return MODES.includes(stored) ? stored : 'system';
}

export function paletteFor(mode, systemDark = false) {
  const resolved = MODES.includes(mode) ? mode : 'system';
  return resolved === 'dark' || (resolved === 'system' && systemDark) ? 'dark' : 'light';
}

/** Apply CSS variables from the single token source. Query overrides stay ephemeral. */
export function applyTheme(mode) {
  const resolved = MODES.includes(mode) ? mode : 'system';
  const systemDark = Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const dark = paletteFor(resolved, systemDark) === 'dark';
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.dataset.theme = resolved;
  for (const [name, value] of Object.entries({
    ...FOUNDATION_TOKENS,
    ...TOKENS[dark ? 'dark' : 'light'],
  })) {
    root.style.setProperty(`--${name}`, value);
  }
  return resolved;
}

/** Remember a choice the person made with the theme control. */
export function saveTheme(mode) {
  window.localStorage.setItem(KEY, mode);
  return applyTheme(mode);
}

/**
 * Design tokens: single source of truth. index.css must mirror these values
 * (enforced by tokens.test.js), and every pair in CONTRAST_PAIRS must meet
 * WCAG AA. See docs/08-ux-spec.md#design-tokens.
 *
 * Palette values are adapted from the supplied AccessFix page screenshots.
 * Brand crimson is kept on actions; links and small text use accessible variants.
 */
export const TOKENS = {
  light: {
    background: '#f7f7f8',
    surface: '#ffffff',
    raised: '#f0eff2',
    foreground: '#17161a',
    'muted-foreground': '#55545c',
    primary: '#b90f32',
    'primary-foreground': '#ffffff',
    link: '#1d4ed8',
    border: '#d5d3d9',
    input: '#73717a',
    ring: '#1d4ed8',
    critical: '#b91c1c',
    serious: '#b3410e',
    moderate: '#8a5300',
    minor: '#1d4ed8',
    verified: '#13733a',
  },
  dark: {
    background: '#0d0c10',
    surface: '#141318',
    raised: '#1b1a20',
    foreground: '#f6f5f7',
    'muted-foreground': '#b8b6bf',
    primary: '#cf1237',
    'primary-foreground': '#ffffff',
    link: '#9bbcff',
    border: '#39373e',
    input: '#918f98',
    ring: '#9bbcff',
    critical: '#ff7b86',
    serious: '#ffa15c',
    moderate: '#f5c542',
    minor: '#8fb4ff',
    verified: '#4ade80',
  },
};

/** Shared non-colour tokens from the supplied screens and the product brief. */
export const FOUNDATION_TOKENS = {
  space: '0.25rem',
  'type-xs': '0.75rem',
  'type-label': '0.875rem',
  'type-body': '1rem',
  'type-lg': '1.125rem',
  'type-xl': '1.25rem',
  'type-title': '1.5rem',
  'type-3xl': '1.875rem',
  'type-4xl': '2.25rem',
  'type-display': 'clamp(2.5rem, 5vw, 4.5rem)',
  'font-family-sans': "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  'font-family-mono': "ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace",
  'line-length': '72ch',
  'radius-control': '0.375rem',
  'radius-panel': '0.5rem',
  'radius-card': '0.625rem',
  'radius-hero': '0.75rem',
  'elevation-card': 'none',
  'elevation-floating': '0 16px 40px rgb(0 0 0 / 28%)',
  'motion-fast': '120ms',
  'motion-standard': '180ms',
  'motion-route': '220ms',
};

const TEXT = 4.5;
const NON_TEXT = 3;
const SURFACES = ['background', 'surface', 'raised'];
const TEXT_TOKENS = [
  'foreground',
  'muted-foreground',
  'link',
  'critical',
  'serious',
  'moderate',
  'minor',
  'verified',
];

/** [foreground token, background token, minimum ratio] */
export const CONTRAST_PAIRS = [
  ...TEXT_TOKENS.flatMap((t) => SURFACES.map((s) => [t, s, TEXT])),
  ...['input', 'ring', 'primary'].flatMap((t) => SURFACES.map((s) => [t, s, NON_TEXT])),
  ['primary-foreground', 'primary', TEXT],
];

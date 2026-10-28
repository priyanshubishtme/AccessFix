import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/contrast.js';
import { applyTheme, paletteFor, readTheme } from '@/lib/theme.js';
import { CONTRAST_PAIRS, FOUNDATION_TOKENS, TOKENS } from './tokens.js';

// Vitest runs from frontend/; CSS imports are stubbed in tests, so read the file directly.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

describe.each(Object.keys(TOKENS))('%s theme', (theme) => {
  const t = TOKENS[theme];

  it.each(CONTRAST_PAIRS)('%s on %s meets %s:1', (fg, bg, min) => {
    expect(contrastRatio(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
  });

  it('index.css exposes palette roles through the runtime token variables', () => {
    for (const [name, value] of Object.entries(t)) {
      expect(css).toContain(`--color-${name}: var(--${name});`);
      expect(value).toMatch(/^#[\da-f]{6}$/i);
    }
  });
});

describe('runtime design tokens', () => {
  it('maps the system preference to the expected palette', () => {
    expect(paletteFor('system', false)).toBe('light');
    expect(paletteFor('system', true)).toBe('dark');
    expect(paletteFor('light', true)).toBe('light');
    expect(paletteFor('dark', false)).toBe('dark');
  });

  it('keeps explicit query themes ahead of saved preference without writing them', () => {
    const href = window.location.href;
    const saved = window.localStorage.getItem('accessfix.theme');
    window.localStorage.setItem('accessfix.theme', 'dark');
    window.history.replaceState(null, '', '/?theme=light');
    try {
      expect(readTheme()).toBe('light');
      expect(window.localStorage.getItem('accessfix.theme')).toBe('dark');
    } finally {
      window.history.replaceState(null, '', href);
      if (saved === null) window.localStorage.removeItem('accessfix.theme');
      else window.localStorage.setItem('accessfix.theme', saved);
    }
  });

  it.each(Object.keys(TOKENS))(
    'applies the %s palette and shared foundation variables',
    (theme) => {
      const previous = window.matchMedia;
      window.matchMedia = () => ({ matches: theme === 'dark' });
      try {
        applyTheme(theme);
        for (const [name, value] of Object.entries({ ...FOUNDATION_TOKENS, ...TOKENS[theme] })) {
          expect(document.documentElement.style.getPropertyValue(`--${name}`)).toBe(value);
        }
      } finally {
        window.matchMedia = previous;
      }
    },
  );

  it('keeps base type, spacing, radius, elevation, and motion roles mapped in Tailwind', () => {
    expect(css).toContain('--spacing: var(--space);');
    expect(css).toContain('--font-sans:');
    expect(css).toContain('--text-base: var(--type-body);');
    expect(css).toContain('--radius-lg: var(--radius-card);');
    expect(css).toContain('--shadow-card: var(--elevation-card);');
    expect(css).toContain('--default-transition-duration: var(--motion-standard);');
  });
});

describe('contrastRatio', () => {
  it('matches known WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});

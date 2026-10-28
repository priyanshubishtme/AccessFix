/** Mirrors backend resolveTarget. Default AA; includeAAA still selects AAA. */
export function scanTarget(options = {}) {
  if (options.target === 'A' || options.target === 'AAA') return options.target;
  if (options.includeAAA) return 'AAA';
  return 'AA';
}

export function standardLabel(target) {
  if (target === 'A') return 'WCAG 2.2 A';
  if (target === 'AAA') return 'WCAG 2.2 AAA';
  return 'WCAG 2.2 AA';
}

export function targetNote(target) {
  if (target === 'A') {
    return 'Only Level A automated checks ran. AA and AAA were not evaluated — they are not passes.';
  }
  if (target === 'AAA') {
    return 'A, AA, and axe-core AAA tags ran. Most AAA criteria still need a person. This is not certification.';
  }
  return 'Level A and AA automated checks ran. AAA was not evaluated.';
}

export const TARGETS = [
  { id: 'A', label: 'A', hint: 'Level A only' },
  { id: 'AA', label: 'AA', hint: 'A + AA (default)' },
  { id: 'AAA', label: 'AAA', hint: 'A + AA + axe AAA tags' },
];

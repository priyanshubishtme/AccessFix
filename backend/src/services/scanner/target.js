/**
 * WCAG target for a scan. The formula does not change; only which axe tags run.
 * A is a subset of AA. AAA adds axe's AAA tags on top of A and AA.
 * Coverage is still only what axe-core implements — never a conformance claim.
 */

export function resolveTarget(options = {}) {
  if (options.target === 'A' || options.target === 'AAA') return options.target;
  if (options.includeAAA) return 'AAA';
  return 'AA';
}

export function standardLabel(target) {
  if (target === 'A') return 'WCAG 2.2 A';
  if (target === 'AAA') return 'WCAG 2.2 AAA';
  return 'WCAG 2.2 AA';
}

/** axe-core tags for the chosen target. Best-practice stays advisory. */
export function axeTags(options = {}) {
  const target = resolveTarget(options);
  const tags = ['wcag2a', 'wcag21a'];
  if (target !== 'A') tags.push('wcag2aa', 'wcag21aa', 'wcag22aa');
  if (target === 'AAA') tags.push('wcag2aaa', 'wcag21aaa', 'wcag22aaa');
  if (options.includeBestPractice) tags.push('best-practice');
  return tags;
}

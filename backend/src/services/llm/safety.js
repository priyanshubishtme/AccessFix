import { z } from 'zod';
import { PROMPT_VERSION, SYSTEM_PROMPT, userPrompt } from './prompts/v1.js';
export { PROMPT_VERSION, SYSTEM_PROMPT, userPrompt };

export const MAX_OUTPUT_TOKENS = 600;
export const MAX_BATCH = 10;
export const MAX_VISION_PER_BATCH = 5;
export const MAX_VISION_BYTES = 80_000;
export const SNIPPET_CHARS = 600;
export const CONTEXT_CHARS = 400;
export const MAX_DRAFT = { 'image-alt': 125, 'input-image-alt': 80 };
export const DEFAULT_MAX_DRAFT = 80;

export const LLM_ASSISTED = new Set([
  'image-alt',
  'input-image-alt',
  'link-name',
  'button-name',
  'input-button-name',
  'label',
]);

export const BatchOut = z.object({
  items: z
    .array(
      z.object({
        key: z.string().min(1),
        text: z.string().min(1).max(200),
        confidence: z.enum(['high', 'medium', 'low']).default('medium'),
      }),
    )
    .max(MAX_BATCH),
});

const URL_RE = /https?:\/\/|www\.|mailto:|\/[\w.-]+\.[a-z]{2,}/i;
const INSTRUCTION_RE =
  /\b(ignore (?:all |any |previous )?instructions|system prompt|developer message|as an ai|i cannot|you should|you must|please provide|here is the (?:alt text|answer))\b/i;

/** Alt text and button names must be plain words: no markup, no links, no TODO. */
export function isSafeDraft(text, ruleId) {
  const t = String(text ?? '').trim();
  const max = MAX_DRAFT[ruleId] ?? DEFAULT_MAX_DRAFT;
  if (!t || t.length > max) return false;
  if (/[<>]/.test(t) || /&\w+;/.test(t)) return false;
  if (URL_RE.test(t)) return false;
  if (INSTRUCTION_RE.test(t)) return false;
  if (/TODO:/i.test(t)) return false;
  if (/\n/.test(t)) return false;
  return true;
}

/** ~chars/4 plus a fixed prompt overhead. Used to size batches before a call. */
export function estimateTokens(items, { vision = 0 } = {}) {
  const chars = items.reduce(
    (n, t) => n + (t.snippet?.length ?? 0) + (t.context?.length ?? 0) + 40,
    SYSTEM_PROMPT.length + 80,
  );
  return Math.ceil(chars / 4) + 80 + vision * 800;
}

export function naiveEstimateTokens(violations) {
  return violations.reduce((n, v) => {
    const html = Math.min((v.node?.html ?? '').length, 2000);
    return n + 200 + Math.ceil(html / 4) + 200;
  }, 0);
}

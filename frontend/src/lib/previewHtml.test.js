import { describe, expect, it } from 'vitest';
import { withPreviewBase } from './previewHtml.js';

describe('withPreviewBase', () => {
  it('resolves relative stylesheets against the scanned page URL', () => {
    const result = withPreviewBase('<html><head><link rel="stylesheet" href="/site.css"></head></html>', 'https://example.com/path');
    expect(result).toContain('<head><base href="https://example.com/path"><link rel="stylesheet" href="/site.css">');
  });

  it('replaces an existing base URL without duplicating it', () => {
    const result = withPreviewBase('<head><base href="old/"><link href="style.css"></head>', 'https://example.com/');
    expect(result.match(/<base\b/g)).toHaveLength(1);
    expect(result).toContain('<base href="https://example.com/">');
  });

  it('escapes the base URL and leaves HTML unchanged when no URL is known', () => {
    expect(withPreviewBase('<head></head>', 'https://example.com/?a="b"&c=1')).toContain('a=&quot;b&quot;&amp;c=1');
    expect(withPreviewBase('<head></head>', '')).toBe('<head></head>');
  });
});

/** Add the scanned page URL so relative stylesheets, images, and fonts resolve in srcDoc. */
export function withPreviewBase(html, baseUrl) {
  if (!html || !baseUrl) return html;
  const base = `<base href="${String(baseUrl)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')}">`;
  if (/<base\b[^>]*>/i.test(html)) return html.replace(/<base\b[^>]*>/i, base);
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (head) => `${head}${base}`);
  if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, (tag) => `${tag}<head>${base}</head>`);
  return `<head>${base}</head>${html}`;
}

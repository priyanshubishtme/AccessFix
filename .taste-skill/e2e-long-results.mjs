/* global document, console */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const folder = 'docs/ui-gallery/checkpoint-4/long-results/dark';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    colorScheme: 'dark',
    viewport: { width: 1280, height: 900 },
  });
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('http://127.0.0.1:5175/?theme=dark', { waitUntil: 'networkidle' });
  await page
    .getByLabel('HTML to scan')
    .fill(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Dense issue list</title></head><body><main><h1>Thirty five unnamed buttons</h1>${'<button></button>'.repeat(35)}</main></body></html>`,
    );
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  await page.getByRole('heading', { name: 'Scan results' }).waitFor({ timeout: 90000 });
  const issueCount = await page.locator('[id^="issue-"]').count();
  if (issueCount < 30) throw new Error(`Expected at least 30 issue rows, got ${issueCount}.`);
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 640, height: 900 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    if (metrics.page > metrics.viewport)
      throw new Error(`Horizontal overflow with long results: ${JSON.stringify(metrics)}`);
    await page.screenshot({
      path: `${folder}/${viewport.width}.png`,
      fullPage: true,
    });
    console.log(`${viewport.width}px, ${issueCount} issue rows`, JSON.stringify(metrics));
  }
  if (failures.length) throw new Error(`Page errors: ${failures.join('; ')}`);
} finally {
  await browser.close();
}

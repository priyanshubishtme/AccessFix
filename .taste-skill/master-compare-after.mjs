/* global console, document */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = 'docs/ui-gallery/master-audit/after/fullscreen/dark';
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:5176/?theme=dark', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /try the broken sample/i }).click();
  await page.getByRole('heading', { name: 'Scan results' }).waitFor({ timeout: 90_000 });
  await page.getByRole('button', { name: 'Suggest fixes' }).click();
  const apply = page.getByRole('button', { name: 'Apply verified fixes' });
  await apply.waitFor({ timeout: 60_000 });
  await apply.click();
  await page.getByAltText('Page after verified fixes').waitFor({ timeout: 90_000 });
  await page.getByRole('img', { name: 'Page after verified fixes' }).waitFor();
  await page.waitForFunction(() => {
    const img = document.querySelector('img[alt^="Page after verified fixes"]');
    return img?.complete && img.naturalWidth > 0;
  });
  await page.getByRole('button', { name: 'Full screen' }).click();
  await page.getByRole('dialog', { name: 'Full-screen comparison' }).waitFor();
  for (const width of [1280, 768, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.screenshot({ path: join(root, `${width}.png`), fullPage: true });
  }
  console.log(JSON.stringify({ errors, screenshotWidths: [1280, 768, 375] }));
  await page.close();
} finally {
  await browser.close();
}

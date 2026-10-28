/* global process, window, document, getComputedStyle, console */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const [url = 'http://127.0.0.1:5175/', output = 'docs/ui-gallery/checkpoint-2/after'] =
  process.argv.slice(2);
const viewports = [
  { width: 1280, height: 900 },
  { width: 768, height: 900 },
  { width: 375, height: 812 },
];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ colorScheme: 'dark' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}theme=dark`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /try the broken sample/i }).click();
  await page.getByRole('heading', { name: 'Scan results' }).waitFor({ timeout: 90000 });
  await page.getByRole('heading', { name: 'Issues' }).waitFor();
  await mkdir(output, { recursive: true });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      scoreSticky: getComputedStyle(
        document.querySelector('aside[aria-label="Sticky scan summary"]'),
      ).position,
      collapsed: [...document.querySelectorAll('details')].filter((item) => !item.open).length,
    }));
    console.log(`${viewport.width}px`, JSON.stringify(metrics));
    await page.screenshot({ path: join(output, `${viewport.width}-viewport.png`) });
    await page.screenshot({ path: join(output, `${viewport.width}.png`), fullPage: true });
  }
  console.log('page errors', JSON.stringify(errors));
} finally {
  await browser.close();
}

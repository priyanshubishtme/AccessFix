/* global process, window, document, console */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const [url = 'http://localhost:5173/', output = 'docs/ui-gallery', theme = 'dark'] =
  process.argv.slice(2);
const viewports = [
  { width: 1280, height: 900 },
  { width: 768, height: 900 },
  { width: 375, height: 812 },
];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}theme=${theme}`, {
    waitUntil: 'networkidle',
  });
  await mkdir(output, { recursive: true });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      scrollX: window.scrollX,
    }));
    console.log(`${viewport.width}px`, JSON.stringify(metrics));
    await page.screenshot({ path: join(output, `${viewport.width}-viewport.png`) });
    await page.screenshot({ path: join(output, `${viewport.width}.png`), fullPage: true });
  }
} finally {
  await browser.close();
}

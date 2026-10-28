/* global process, console, document */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = 'docs/ui-gallery/checkpoint-4';
const routes = [
  ['landing', '/'],
  ['history', '/history'],
  ['business', '/business'],
  ['login', '/login'],
  ['signup', '/signup'],
  ['projects', '/projects'],
  ['report-expired', '/scans/gallery-missing/report'],
  ['share-expired', '/shares/gallery-missing'],
  ['not-found', '/not-a-route'],
].filter(([name]) => !process.env.ROUTE || process.env.ROUTE === name);
const viewports = [
  { width: 1280, height: 900 },
  { width: 768, height: 900 },
  { width: 375, height: 812 },
];
const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => failures.push(error.message));
  for (const [name, route] of routes) {
    for (const theme of ['light', 'dark']) {
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto(`http://127.0.0.1:5175${route}?theme=${theme}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(250);
        const metrics = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
        }));
        if (metrics.page > metrics.viewport)
          failures.push(`${theme} ${route} ${viewport.width}: overflow ${JSON.stringify(metrics)}`);
        const folder = join(root, name, theme);
        await mkdir(folder, { recursive: true });
        await page.screenshot({ path: join(folder, `${viewport.width}.png`), fullPage: true });
        console.log(`${name} ${theme} ${viewport.width}px`, JSON.stringify(metrics));
      }
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}

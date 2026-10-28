/* global console, document, getComputedStyle */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = 'docs/ui-gallery/master-audit/after';
const viewports = [
  { width: 1280, height: 900 },
  { width: 768, height: 900 },
  { width: 375, height: 812 },
];
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ colorScheme: theme });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://localhost:5176/?theme=${theme}`, { waitUntil: 'networkidle' });
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const metrics = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
      }));
      const folder = join(root, 'landing', theme);
      await mkdir(folder, { recursive: true });
      await page.screenshot({ path: join(folder, `${viewport.width}.png`), fullPage: true });
      console.log('landing', theme, viewport.width, JSON.stringify(metrics));
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: /try the broken sample/i }).click();
    await page.getByRole('heading', { name: 'Scan results' }).waitFor({ timeout: 90000 });
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const folder = join(root, 'results', theme);
      await mkdir(folder, { recursive: true });
      await page.screenshot({ path: join(folder, `${viewport.width}.png`), fullPage: true });
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    const panelNames = await page
      .locator('details > summary')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => !node.parentElement?.parentElement?.closest('details'))
          .map((node) => node.innerText.trim()),
      );
    for (const panelName of panelNames) {
      const summary = page.locator('details > summary').filter({ hasText: panelName }).first();
      const label = panelName
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      await summary.click();
      const folder = join(root, 'results', theme, 'panels');
      await mkdir(folder, { recursive: true });
      await page.screenshot({ path: join(folder, `${label}.png`), fullPage: true });
      await summary.click();
    }
    await page.locator('details > summary').filter({ hasText: 'Color and contrast' }).click();
    const preview = page.locator('img[alt^="Page before fixes"]').first();
    const originalSample = await preview.screenshot();
    await page.getByRole('button', { name: 'Red-weak (Protanopia)' }).click();
    const filteredSample = await preview.screenshot();
    const filterState = await preview.evaluate((img) => ({
      filter: getComputedStyle(img).filter,
      source: img.currentSrc,
      loaded: img.complete && img.naturalWidth > 0,
      matrixCount: document.querySelectorAll('filter feColorMatrix').length,
      filterId: getComputedStyle(img).filter.match(/#([^")]+)/)?.[1] ?? null,
      filterReferenceExists: Boolean(
        document.getElementById(getComputedStyle(img).filter.match(/#([^")]+)/)?.[1] ?? ''),
      ),
    }));
    const colorFolder = join(root, 'colors', theme);
    await mkdir(colorFolder, { recursive: true });
    await page.screenshot({ path: join(colorFolder, 'protanopia.png'), fullPage: true });
    console.log(
      'color filter',
      theme,
      JSON.stringify({ ...filterState, sampleChanged: !originalSample.equals(filteredSample) }),
    );
    await page.getByRole('button', { name: 'Full screen' }).click();
    const fullscreenFilter = await page
      .getByRole('dialog', { name: 'Full-screen comparison' })
      .locator('img[alt^="Page before fixes"]')
      .evaluate((img) => getComputedStyle(img).filter);
    await page.screenshot({
      path: join(colorFolder, 'fullscreen-protanopia.png'),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    console.log('fullscreen color filter', theme, fullscreenFilter);
    console.log('page errors', theme, JSON.stringify(errors));
    await page.close();
  }
} finally {
  await browser.close();
}



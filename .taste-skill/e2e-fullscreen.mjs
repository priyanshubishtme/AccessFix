/* global process, console, window, document, URL, getComputedStyle */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const output = 'docs/ui-gallery/checkpoint-3';
const viewports = [
  { width: 1280, height: 900 },
  { width: 768, height: 900 },
  { width: 375, height: 812 },
];
await mkdir(join(output, 'before'), { recursive: true });
await mkdir(join(output, 'after'), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ colorScheme: 'dark', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  const remoteRequests = [];
  const consoleErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/401 \(Unauthorized\)/.test(message.text()))
      consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? '';
    if (failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.url()} ${failure}`);
  });
  page.on('request', (request) => {
    if (/cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/.test(request.url()))
      remoteRequests.push(request.url());
  });
  await page.goto('http://127.0.0.1:5175/?theme=dark', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /try the broken sample/i }).click();
  await page.getByRole('heading', { name: 'Scan results' }).waitFor({ timeout: 90000 });
  await page.getByRole('button', { name: 'Suggest fixes' }).click();
  await page.getByRole('button', { name: 'Apply verified fixes' }).waitFor({ timeout: 90000 });

  // Keep the sample scan open before Apply as a visual baseline for the comparison.
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: join(output, 'before', `${viewport.width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Apply verified fixes' }).click();
  await page.getByText('Verified fixes applied to a copy').waitFor({ timeout: 120000 });
  await page
    .locator('details > summary')
    .filter({ hasText: /^Patched code$/ })
    .click();
  const downloadLink = page.getByRole('link', { name: 'Download patched HTML' });
  const downloadHref = await downloadLink.getAttribute('href');
  const downloadResponse = await page.request.get(new URL(downloadHref, page.url()).href);
  const downloadDisposition = downloadResponse.headers()['content-disposition'] ?? '';
  if (!downloadResponse.ok() || !/\.html/.test(downloadDisposition))
    throw new Error(
      `Patched HTML download failed: ${downloadResponse.status()} ${downloadDisposition}`,
    );
  await page.getByRole('button', { name: 'Full screen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Full-screen comparison' });
  await dialog.waitFor();
  await dialog.getByRole('slider', { name: 'Before and after comparison' }).waitFor();
  const slider = dialog.getByRole('slider', { name: 'Before and after comparison' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  const keyboardValue = await slider.getAttribute('aria-valuenow');
  const bounds = await slider.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.4, bounds.y + bounds.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.5);
  await page.mouse.up();
  const pointerValue = await slider.getAttribute('aria-valuenow');
  await dialog.getByRole('button', { name: 'Side by side' }).click();
  await dialog.getByRole('button', { name: 'Before only' }).click();
  await dialog.getByRole('button', { name: 'After only' }).click();
  await dialog.getByRole('button', { name: 'Slider' }).click();
  await dialog.getByRole('button', { name: 'Zoom in' }).click();
  await dialog.getByRole('button', { name: 'Zoom out' }).click();
  await dialog.getByRole('button', { name: 'Next issue' }).click();
  await dialog.getByRole('button', { name: 'Close full-screen comparison' }).focus();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    await page.screenshot({ path: join(output, 'after', `${viewport.width}.png`) });
    console.log(`${viewport.width}px fullscreen`, JSON.stringify(metrics));
    if (viewport.width === 375) {
      const issuesToggle = dialog.getByRole('button', { name: 'Issues', exact: false });
      await issuesToggle.click();
      await dialog.getByRole('complementary', { name: 'Preview issues' }).waitFor();
      await page.screenshot({ path: join(output, 'after', '375-issues.png') });
    }
  }
  await page.keyboard.press('Escape');
  const focusRestored = await page
    .getByRole('button', { name: 'Full screen' })
    .evaluate((node) => node === document.activeElement);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByLabel('Theme').selectOption('light');
  await page.getByRole('button', { name: 'Full screen' }).click();
  const lightDialog = page.getByRole('dialog', { name: 'Full-screen comparison' });
  await lightDialog.waitFor();
  await page.screenshot({ path: join(output, 'after', '1280-light.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Show original and patched code' }).click();
  try {
    await page.locator('.monaco-diff-editor').first().waitFor({ timeout: 20000 });
  } catch {
    console.log(
      JSON.stringify({
        errors,
        consoleErrors,
        failedRequests,
        remoteRequests,
        editorState: await page.locator('body').innerText(),
        monacoClasses: await page
          .locator('[class*="monaco"]')
          .evaluateAll((nodes) => nodes.map((node) => node.className)),
      }),
    );
    throw new Error('The local Monaco editor did not mount.');
  }
  const reportHref = await page
    .getByRole('link', { name: 'Open shareable report' })
    .getAttribute('href');
  await page.goto(new URL(reportHref, page.url()).href, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Accessibility report' }).waitFor({ timeout: 20000 });
  const reportGallery = 'docs/ui-gallery/checkpoint-4/report-completed/light';
  await mkdir(reportGallery, { recursive: true });
  await page.screenshot({ path: join(reportGallery, '1280.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  const printVisibility = await page.evaluate(() => ({
    header: getComputedStyle(document.querySelector('header')).display,
    actions: getComputedStyle(document.querySelector('.print-hidden')).display,
    report: getComputedStyle(document.querySelector('.print-report')).display,
  }));
  if (
    printVisibility.header !== 'none' ||
    printVisibility.actions !== 'none' ||
    printVisibility.report === 'none'
  )
    throw new Error(`Report print styles failed: ${JSON.stringify(printVisibility)}`);
  await page.screenshot({ path: join(reportGallery, 'print.png'), fullPage: true });
  console.log(
    JSON.stringify({
      keyboardValue,
      pointerValue,
      focusRestored,
      download: downloadResponse.status(),
      errors,
      consoleErrors,
      failedRequests,
      remoteRequests,
    }),
  );
  if (
    errors.length ||
    consoleErrors.length ||
    failedRequests.length ||
    remoteRequests.length ||
    !focusRestored ||
    keyboardValue === pointerValue
  )
    process.exitCode = 1;
} finally {
  await browser.close();
}

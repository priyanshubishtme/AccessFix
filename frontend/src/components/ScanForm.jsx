import { useId, useRef, useState } from 'react';
import { FileCode2, FileUp, FlaskConical, Globe, ScanSearch, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card } from '@/components/ui/card.jsx';
import { Tabs } from '@/components/ui/tabs.jsx';
import { inlineCss } from '@/lib/inlineCss.js';
import { TARGETS } from '@/lib/target.js';
import sampleHtml from '../../../samples/broken-sample.html?raw';
import demoHtml from '../../../samples/demo-script.html?raw';

function optionsFor(target, extra = {}) {
  return { target, includeAAA: target === 'AAA', ...extra };
}

const DEFAULT_MAX_BYTES = 5_000_000;
export const formatBytes = (n) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} MB`
    : `${(n / 1024).toFixed(n < 10_240 ? 1 : 0)} KB`;
const byteLength = (s) => new TextEncoder().encode(s).length;

/** @returns {string | null} error message */
export function validateInput(mode, html, url, maxBytes) {
  if (mode === 'html' || mode === 'files') {
    if (!html.trim())
      return mode === 'files' ? 'Choose an .html file first.' : 'Paste some HTML first.';
    const bytes = byteLength(html);
    if (bytes > maxBytes)
      return `That HTML is ${formatBytes(bytes)}; the limit is ${formatBytes(maxBytes)}.`;
    return null;
  }
  if (!url.trim()) return 'Enter a URL first.';
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:')
      return 'Only http and https URLs can be scanned.';
  } catch {
    return 'That is not a valid URL. Include https://';
  }
  return null;
}

const field =
  'w-full rounded-md border border-input bg-background text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2';

/**
 * @param {{ onSubmit: (input: object) => void, busy: boolean, disabledReason: string | null,
 *   maxBytes?: number, crawl?: { maxPages: number, maxDepth: number, budgetMs: number, gapMs: number } }} props
 */
export function ScanForm({
  onSubmit,
  busy,
  disabledReason,
  maxBytes = DEFAULT_MAX_BYTES,
  crawl: crawlLimits,
}) {
  const uid = useId();
  const [mode, setMode] = useState('html');
  const [html, setHtml] = useState('');
  const [files, setFiles] = useState({ html: null, css: [] });
  const [url, setUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [crawl, setCrawl] = useState(false);
  const [waitFor, setWaitFor] = useState('');
  const [authText, setAuthText] = useState('');
  const [target, setTarget] = useState('AA');
  const [error, setError] = useState(null);
  const fieldRef = useRef(null);

  const bytes = byteLength(html);
  const errorId = `${uid}-error`;
  const hintId = `${uid}-hint`;
  const combined = files.html ? inlineCss(files.html.text, files.css) : null;
  const combinedBytes = combined ? byteLength(combined.html) : 0;

  const submit = (e) => {
    e?.preventDefault();
    const source = mode === 'files' ? (combined?.html ?? '') : html;
    const message = validateInput(mode, source, url, maxBytes);
    setError(message);
    if (message) {
      fieldRef.current?.focus();
      return;
    }
    if (mode === 'html' || mode === 'files') {
      onSubmit({ input: { type: 'html', html: source, ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}) }, options: optionsFor(target) });
      return;
    }
    let auth;
    if (authText.trim()) {
      try {
        auth = JSON.parse(authText);
      } catch {
        setError('Login state has to be JSON: a storageState object or { "cookies": [...] }.');
        return;
      }
    }
    const extra = {};
    if (crawl) extra.crawl = true;
    if (waitFor.trim()) extra.waitFor = waitFor.trim();
    const input = { type: 'url', url: url.trim() };
    onSubmit({ input, options: optionsFor(target, extra), ...(auth ? { auth } : {}) });
  };

  const pick = async (list) => {
    setError(null);
    const chosen = [...(list ?? [])];
    const htmlFile = chosen.find((f) => /\.html?$/i.test(f.name));
    const cssFiles = chosen.filter((f) => /\.css$/i.test(f.name));
    const ignored = chosen.filter((f) => f !== htmlFile && !cssFiles.includes(f));
    const next = {
      html: htmlFile
        ? { name: htmlFile.name, text: await htmlFile.text(), size: htmlFile.size }
        : files.html,
      css: [
        ...files.css.filter(
          (c) => !cssFiles.some((f) => f.name.toLowerCase() === c.name.toLowerCase()),
        ),
        ...(await Promise.all(
          cssFiles.map(async (f) => ({ name: f.name, text: await f.text(), size: f.size })),
        )),
      ],
    };
    setFiles(next);
    if (ignored.length)
      setError(
        `Skipped ${ignored.map((f) => f.name).join(', ')}: only .html and .css files are read.`,
      );
  };

  const run = (source) => {
    setMode('html');
    setHtml(source);
    setError(null);
    onSubmit({ input: { type: 'html', html: source }, options: optionsFor(target) });
  };

  const disabled = busy || Boolean(disabledReason);
  const describedBy = [error ? errorId : null, hintId].filter(Boolean).join(' ');

  return (
    <Card
      as="form"
      id="scan-form"
      onSubmit={submit}
      noValidate
      aria-label="Scan input"
      className="rounded-xl border bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Start a scan</h2>
        <p className="text-sm text-muted-foreground">Rendered in an isolated browser · Chromium</p>
      </div>
      <div className="mt-4">
        <Tabs
          id={`${uid}-mode`}
          label="Input type"
          tabs={[
            { value: 'html', label: 'Paste HTML' },
            { value: 'files', label: 'Upload files' },
            { value: 'url', label: 'Scan a URL' },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v);
            setError(null);
          }}
        >
          {(value) =>
            value === 'html' ? (
              <div>
                <label htmlFor={`${uid}-html`} className="block text-sm font-medium">
                  HTML to scan
                </label>
                <textarea
                  id={`${uid}-html`}
                  ref={fieldRef}
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={10}
                  spellCheck={false}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                  className={`${field} mt-2 p-3 font-mono leading-6`}
                  placeholder="<!doctype html>…"
                />
                <label htmlFor={`${uid}-base-url`} className="mt-3 block text-sm font-medium">Base URL for relative assets (optional)</label>
                <input id={`${uid}-base-url`} type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://example.com/path/" className={`${field} mt-1`} />
                <p id={hintId} className="mt-2 text-sm text-muted-foreground">
                  <span className="tabular">
                    {formatBytes(bytes)} of {formatBytes(maxBytes)}
                  </span>
                  . Paste HTML, not JSX. Inline &lt;style&gt; and scripts run. Public external CSS
                  and images load; private addresses are blocked.
                </p>
              </div>
            ) : value === 'files' ? (
              <div>
                <div
                  ref={fieldRef}
                  role="button"
                  tabIndex={0}
                  aria-label="Choose or drop HTML and CSS files"
                  aria-controls={`${uid}-files`}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-background px-4 py-8 text-center hover:bg-raised"
                  onClick={() => document.getElementById(`${uid}-files`)?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      document.getElementById(`${uid}-files`)?.click();
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pick(e.dataTransfer.files);
                  }}
                >
                  <FileUp aria-hidden="true" className="size-6 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Choose or drop one .html file and its .css files
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Read in your browser. Nothing is uploaded until you scan.
                  </span>
                </div>
                <input
                  id={`${uid}-files`}
                  type="file"
                  multiple
                  accept=".html,.htm,.css,text/html,text/css"
                  className="sr-only"
                  aria-label="HTML and CSS files"
                  aria-describedby={describedBy}
                  onChange={(e) => {
                    pick(e.target.files);
                    e.target.value = '';
                  }}
                />
                {(files.html || files.css.length > 0) && (
                  <ul
                    className="mt-3 divide-y rounded-lg border bg-background text-sm"
                    aria-label="Chosen files"
                  >
                    {[
                      ...(files.html ? [{ ...files.html, kind: 'html' }] : []),
                      ...files.css.map((c) => ({ ...c, kind: 'css' })),
                    ].map((file) => (
                      <li
                        key={`${file.kind}-${file.name}`}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <FileCode2 aria-hidden="true" className="size-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-mono">{file.name}</span>
                        <span className="tabular text-muted-foreground">
                          {formatBytes(file.size)}
                        </span>
                        {file.kind === 'css' && combined && (
                          <span className="text-muted-foreground">
                            {combined.linked.includes(file.name)
                              ? 'replaces its <link>'
                              : 'added to <head>'}
                          </span>
                        )}
                        <button
                          type="button"
                          className="inline-flex size-9 items-center justify-center rounded-md hover:bg-raised"
                          onClick={() =>
                            setFiles((f) =>
                              file.kind === 'html'
                                ? { ...f, html: null }
                                : { ...f, css: f.css.filter((c) => c.name !== file.name) },
                            )
                          }
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          <span className="sr-only">Remove {file.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p id={hintId} className="mt-2 text-sm text-muted-foreground">
                  {files.html ? (
                    <span className="tabular">
                      Combined page {formatBytes(combinedBytes)} of {formatBytes(maxBytes)}.{' '}
                    </span>
                  ) : null}
                  CSS is placed inside the HTML before scanning, so fixes land in one file. Relative
                  images and scripts are not uploaded and will not load.
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor={`${uid}-url`} className="block text-sm font-medium">
                  Page URL
                </label>
                <div className="relative mt-2">
                  <Globe
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id={`${uid}-url`}
                    ref={fieldRef}
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    className={`${field} min-h-11 pl-9 pr-3`}
                    placeholder="https://example.com"
                  />
                </div>
                <p id={hintId} className="mt-2 text-sm text-muted-foreground">
                  Public http(s) pages only. Private and internal addresses are blocked, and every
                  redirect is checked. This is a screenshot of an isolated render, not a live
                  browser in this tab.
                </p>
                <div className="mt-4 rounded-lg border bg-background p-4">
                  <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={crawl}
                      onChange={(e) => setCrawl(e.target.checked)}
                    />
                    Crawl this site
                  </label>
                  <p className="mb-2 ml-7 text-sm text-muted-foreground">
                    Follow same-site links and scan multiple pages from this URL.
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Sign in required. We read robots.txt, then follow links on the same host
                    breadth-first
                    {crawlLimits
                      ? `: up to ${crawlLimits.maxPages} pages, ${crawlLimits.maxDepth} clicks deep, ${Math.round(
                          crawlLimits.budgetMs / 60000,
                        )} minutes in total, one page at a time with a ${crawlLimits.gapMs} ms pause`
                      : ', one page at a time, within the server page and time limits'}
                    . Pages that do not fit are listed as skipped with the reason. Login-protected
                    pages are not discovered automatically — paste storage state under Advanced.
                  </p>
                </div>
                <details className="mt-4 rounded-lg border bg-background p-3">
                  <summary className="min-h-10 cursor-pointer content-center text-sm font-medium">
                    Advanced: wait for selector, login state
                  </summary>
                  <label htmlFor={`${uid}-wait`} className="mt-3 block text-sm font-medium">
                    Wait for selector (optional)
                  </label>
                  <input
                    id={`${uid}-wait`}
                    value={waitFor}
                    onChange={(e) => setWaitFor(e.target.value)}
                    className={`${field} mt-2 min-h-11 px-3`}
                    placeholder="#app"
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    For single-page apps: we wait up to 5 s for it to appear.
                  </p>
                  <p className="mt-4 text-sm font-medium">Scan a page that needs a login</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Paste a Playwright storage state or a cookie list. It is encrypted for this scan
                    only, sent to the pinned host, and deleted when the scan finishes — including
                    when you cancel. It is never written to the log or the job queue. Sign in first.
                    An authenticated scan cannot be shared, and its pages are kept for 15 minutes
                    after the scan finishes. There is no password reset.
                  </p>
                  <label htmlFor={`${uid}-auth`} className="mt-3 block text-sm font-medium">
                    Login state JSON
                  </label>
                  <textarea
                    id={`${uid}-auth`}
                    value={authText}
                    onChange={(e) => setAuthText(e.target.value)}
                    rows={4}
                    spellCheck={false}
                    className={`${field} mt-2 p-2 font-mono`}
                    placeholder='{"cookies":[{"name":"sid","value":"...","domain":"example.com"}]}'
                  />
                </details>
              </div>
            )
          }
        </Tabs>
      </div>

      <fieldset className="mt-5 rounded-lg border bg-background p-4">
        <legend className="px-1 text-sm font-medium">WCAG 2.2 target</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {TARGETS.map((item) => (
            <label
              key={item.id}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${
                target === item.id ? 'border-foreground bg-raised font-medium' : 'bg-surface'
              }`}
            >
              <input
                type="radio"
                name={`${uid}-target`}
                value={item.id}
                checked={target === item.id}
                onChange={() => setTarget(item.id)}
                aria-label={`WCAG ${item.id}`}
                className="accent-[var(--primary)]"
              />
              <span>
                {item.label}
                <span className="block text-xs font-normal text-muted-foreground">{item.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {target === 'A' &&
            'Only Level A automated checks. AA failures are not evaluated and do not affect this score. AAA is not a blanket requirement for every kind of content.'}
          {target === 'AA' &&
            'A and AA automated checks (the usual product target). AAA is not evaluated. A high score is not a conformance claim.'}
          {target === 'AAA' &&
            'A, AA, and axe-core AAA tags. Most AAA criteria still need a person. Do not use AAA as a blanket requirement for every kind of content. This is not certification.'}
        </p>
      </fieldset>

      {error && (
        <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-critical">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="submit" disabled={disabled}>
          <ScanSearch aria-hidden="true" className="size-4" />
          {busy ? 'Scanning…' : 'Scan'}
        </Button>
        <Button variant="outline" onClick={() => run(sampleHtml)} disabled={disabled}>
          <FlaskConical aria-hidden="true" className="size-4" />
          Try the broken sample
        </Button>
        <Button variant="ghost" onClick={() => run(demoHtml)} disabled={disabled}>
          Load the 3-minute demo page
        </Button>
      </div>
    </Card>
  );
}

# Inputs, checks, and crawl behavior

This page describes the implementation in this checkout. The scan uses Chromium at the configured `VIEWPORT_WIDTH` × `VIEWPORT_HEIGHT` (1280 × 720 by default). The browser context does not select a dark color scheme, so Chromium's default light scheme is used. JavaScript runs as the page loads.

## What each input means

| Input | What the browser receives |
| --- | --- |
| Pasted HTML | `ScanForm.jsx` sends the text as `input.html`; `scanner/index.js` calls `page.setContent`. An optional HTTP(S) base URL is inserted as the document's `<base>` for relative resources. |
| Uploaded HTML and CSS | `ScanForm.jsx` reads files locally and `inlineCss` places CSS text into `<style>` elements in the HTML before sending it. There is no standalone CSS parser or lint pass. |
| URL | `scanner/index.js` navigates Chromium to the URL. The scan reads the rendered DOM after loading and the configured settling wait. |

## Analysis and fixes

`scanner/index.js` runs axe-core against the rendered DOM, then `scanner/checks/index.js` runs AccessFix's additional DOM checks. JavaScript is executed by Chromium. Axe rules that need computed styles (including text contrast) read the browser-rendered page; source HTML alone is not enough to reproduce those results. The result is still a single 1280 × 720 viewport capture (configurable for self-hosters), not a multi-viewport or full-page audit.

Repair rules live under `backend/src/services/repair/rules/`. Attribute and element fixes edit the input HTML through `backend/src/services/repair/edits.js`; CSS fixes such as `color-contrast` edit matching CSS declarations in the source, and generated helper styles are inserted as a `<style>` block by `backend/src/services/repair/index.js`. The verifier applies edits to a copy, re-scans it, and leaves the original source unchanged.

Not implemented: standalone CSS linting; checking other viewport sizes, dark mode, hover-only states, or application JavaScript logic; full-page screenshots; real screen-reader playback; and source-map edits to React or other source code.

## Crawl steps

`backend/src/services/crawl/execute.js` loads `/robots.txt` before starting. `robots.js` follows up to three redirects, checking each URL with `resolveSafeUrl`; only the `User-agent: *` rules are read. An unreadable robots file is treated as no opinion. `run.js` starts with the seed URL, scans one page at a time breadth-first, and uses `scanner/index.js` to collect rendered `a[href]` links. It normalizes HTTP(S) links in `url.js` by resolving relative links, removing fragments and default ports, and trimming trailing slashes. A set deduplicates normalized URLs.

The first completed response pins the crawl to its final host. Later off-host discoveries are skipped. Robots rules, per-hop URL safety checks in `networkGuard.js`, page and depth caps, crawl pacing, page timeouts, and the overall budget are enforced during traversal. Defaults are 10 pages, depth 2, 180 seconds total, and a 500 ms gap (bounded by the configured delay cap). Cancellation aborts the in-flight page and marks queued pages skipped. Non-HTML responses and scan failures do not become completed pages. Issue rollup deduplicates by the normalized violation signature in `execute.js`.

Each crawl now returns a discovery log with the URL, depth, linking page, status, and skip reason. The results page exposes it as a discovery map. It records discovered links, including duplicate and off-host skips; it is not a JavaScript router crawl.

The crawl map is a keyboard-operable disclosure and can filter its recorded outcomes. Completed page rows include score and issue counts where available. The log is additive to the existing `pages` result field and does not change crawl selection or scoring.

| You might expect | What happens |
| --- | --- |
| JavaScript routes | Only links present as rendered `a[href]` are discovered. Client-side route changes without links are not enumerated. |
| Sitemap crawling | Not implemented. |
| Subdomains | Skipped after the first page pins the host. |
| Login pages | Authenticated scans can use provided browser storage state; the crawler does not discover credentials or login forms. |
| Forms | Not submitted. |

## Asset and download behavior

An optional base URL on pasted HTML lets relative `src`, `srcset`, stylesheet, and CSS URL references resolve during browser rendering. The patched HTML preview also receives the scanned page URL as its document base, so linked stylesheets and relative assets resolve against the original site rather than the AccessFix UI. Each resulting browser request remains subject to the network guard and its SSRF checks. The preview remains a fixed viewport capture; an asset outside the captured viewport may not appear. `GET /scans/:id/source` downloads the original HTML, and `GET /scans/:id/patched.html` downloads the patched HTML. The crawl archive is `GET /scans/:id/pages.zip`. A per-scan menu for both files, a per-page crawl download menu, unified diff download, complete offline asset bundle, and explicit unresolved-asset inventory are not implemented. Uploaded CSS is inlined before scanning, so original file formatting and distinct CSS-file output are not preserved. Standalone CSS linting is also not implemented.

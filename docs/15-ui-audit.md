# AccessFix demo readiness audit

## Baseline

Audited on the `accessfix/master-polish` branch before implementation workstreams.
The application was served at `http://localhost:5175/`; `/health` returned `status: ok`,
the browser check was up, the store was `memory`, and the LLM was off. The app has no
`docs/design-reference/` directory; the local AccessFix PNG exports and
[`14-ui-design-system.md`](14-ui-design-system.md) were available.

The route captures from the preceding UI pass cover landing, History, Business, sign-in,
sign-up, Projects, report/share errors, and 404 in both themes at 1280, 768, and 375px:
[`route gallery`](ui-gallery/README.md#checkpoint-4-remaining-pages-and-qa). The current
results captures and open secondary-panel states are under
[`master-audit/before`](ui-gallery/master-audit/before/). The full-screen baseline is in
[`checkpoint 3`](ui-gallery/README.md#checkpoint-3-full-screen-comparison).

## Defect table

| Page / state         | Defect and evidence                                                                                                                                                                                                                                    | Severity | Planned workstream |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------ |
| Results summary      | Severity counts are repeated in the sticky strip and score card; the strip ring is always `border-primary` while the score meter uses score-band styling. Confirmed in `StickyScoreSummary` and `ScoreCard`.                                           | High     | 1                  |
| Results summary      | Before Suggest fixes, the automatic-fix count renders as an em dash instead of a number or instruction. Confirmed in `StickyScoreSummary`.                                                                                                             | High     | 1                  |
| Results actions      | Suggest fixes uses the primary destructive-looking red accent. The current token makes the action and critical/error colors too similar.                                                                                                               | Medium   | 1                  |
| Results preview      | At the standard desktop viewport the preview competes with the issue panel and its fixed 16:9 frame leaves the capture small.                                                                                                                          | High     | 1, 3               |
| Results marks        | Dense or edge-positioned marks can cover content, collide, or leave the preview bounds; current mark layout requires tighter evidence-based placement.                                                                                                 | High     | 2, 3               |
| Results issues       | The issue list is a nested, height-limited scroll region inside the document scroll; explanatory copy and field labels have similar visual weight. `Mark N` appears both on the mark and in the card.                                                  | High     | 2                  |
| Results issue status | Before a verification attempt, issue wording says “Not verified”, which suggests a failed check.                                                                                                                                                       | Medium   | 2                  |
| Full-screen compare  | Full-screen mode does not yet offer the requested cursor-centered wheel zoom, mark hover/click affordances, keyboard shortcut sheet, synchronized side-by-side pan, or fill/100% fit modes.                                                            | High     | 3                  |
| Full-screen compare  | When there is no after capture, side-by-side can show only the before image without an explicit unavailable-after explanation.                                                                                                                         | Medium   | 3                  |
| Colors tab           | Reproduced: a color-vision selection changes the inline preview image pixels, but the full-screen image retains `filter: none`. Root cause: `Results` passes the SVG filter to `Workbench`, but `Workbench` does not pass it into `FullscreenCompare`. | High     | 4                  |
| Business             | The public page contains plan-changing commands and environment-variable operations.                                                                                                                                                                   | High     | 5                  |
| Business             | The “largest page” value is currently read from `/health`; source config defaults `MAX_HTML_BYTES` to 5,000,000 bytes. The brief says the intended limit is 2 MB, so this conflicts with the live code and is recorded as a decision point.            | Medium   | 5                  |
| Business             | Pricing figures are hard-coded hypotheses and can be mistaken for active quota values; feature table alignment and mobile presentation need work.                                                                                                      | Medium   | 5                  |
| Business             | The WebAIM and FTC statements need primary-source citations or softer wording.                                                                                                                                                                         | Medium   | 5, 8               |
| Images and preview   | Patched HTML is captured/rendered without a reliable original-origin/base-URL path for relative, responsive, CSS, and lazy assets. Asset failures are not fully explained to the user.                                                                 | High     | 3B                 |
| Downloads            | Current download options do not clearly separate original source, updated code, both files, and a changes-only patch for single-page and crawl results.                                                                                                | High     | 3B                 |
| Crawler              | The user sees the pages already scanned, but not every discovered and skipped URL with a reason or the crawl's discovery path.                                                                                                                         | High     | 3B                 |
| Checks               | Stored Checks rows are based on automated rules; click-only, pointer target-size, focus-indicator, and hover-only interaction checks are not present.                                                                                                  | High     | 4                  |
| Login / sign-up      | The account form lacks some requested recovery guidance, field-linked error presentation, 429 countdown, and return-to-route behavior.                                                                                                                 | Medium   | 5                  |
| Deploy guide         | Atlas network example uses `0.0.0.0/4`; the demo-only anywhere rule is `0.0.0.0/0`.                                                                                                                                                                    | High     | 8                  |
| LLM integration      | Existing provider/gateway has useful batching, cache, safety checks, and fallback, but needs a complete pass against JSON repair retry, privacy, env configuration, retry/circuit behavior, and UI states.                                             | High     | 6                  |
| Mongo integration    | Existing Mongo adapter persists core scan data and usage but needs a repository-by-repository audit for pages, discovery, accounts, shares, indexes, schema versioning, lifecycle, and atomic daily counters.                                          | High     | 7                  |

## Reproduced Colors-tab failure

The audit ran the broken-sample scan in both themes, opened **Color and contrast**, selected
**Red-weak (Protanopia)**, and confirmed that the inline screenshot changed while the dialog
screenshot did not. The inline image had a loaded screenshot and a resolved SVG color-matrix
filter. The dialog image's computed `filter` stayed `none`; the filter state was simply not
connected to that component. This is a missing prop/state path, not a problem in the matrix or
the image screenshot endpoint.

Evidence: [light inline](ui-gallery/master-audit/before/colors/light/protanopia.png),
[light full screen](ui-gallery/master-audit/before/colors/light/fullscreen-protanopia.png),
[dark inline](ui-gallery/master-audit/before/colors/dark/protanopia.png),
[dark full screen](ui-gallery/master-audit/before/colors/dark/fullscreen-protanopia.png).
The full-screen capture shows the pre-fix behavior.

## Config decision to record

The supplied brief states a 2 MB HTML limit, while current `backend/src/config/env.js`
defaults `MAX_HTML_BYTES` to 5,000,000, `backend/src/controllers/health.controller.js`
publishes that value as `limits.maxHtmlBytes`, and the running `/health` reports 5,000,000.
The UI already reads that health value. The code therefore currently enforces 5 MB (decimal),
not 2 MB; changing the backend default would alter behavior outside the brief's listed backend
allowlist. Workstream 5 will keep the displayed value tied to `/health` and record this mismatch
instead of silently changing the API limit.

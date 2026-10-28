# 14. UI design system

This system is based on the supplied AccessFix page exports in `AccessFix — Premium Product Design System & Website/`. The connected Figma account currently has Viewer access, and the local reference folder contains PNG exports but no token text file. Pixel values below are therefore screenshot estimates where noted, not claimed source-token values.

## Reference set

- Landing: [Product story](../AccessFix%20%E2%80%94%20Premium%20Product%20Design%20System%20%26%20Website/Landing%20%C2%B7%20Product%20story.png)
- Workspace: [Paste HTML](../AccessFix%20%E2%80%94%20Premium%20Product%20Design%20System%20%26%20Website/Scan%20%C2%B7%20Paste%20HTML.png)
- Results: [Inspect a finding](../AccessFix%20%E2%80%94%20Premium%20Product%20Design%20System%20%26%20Website/Results%20%C2%B7%20Inspect%20a%20finding/Desktop.png)
- Issue detail: [Evidence and recommendation](../AccessFix%20%E2%80%94%20Premium%20Product%20Design%20System%20%26%20Website/Issue%20detail%20%C2%B7%20Evidence%2C%20recommendation%20%26%20review.png)
- Other supplied screens cover repair review, verification, code, history, projects, business, login, and sign-up.

## Tokens

| Token family      | Extracted value or pattern                                                                                                                | Source                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Background        | Neutral near-black, estimated `#0d0c10`; light theme uses an almost-white neutral, estimated `#f7f7f8`                                    | from reference (PNG estimate)                                  |
| Surface           | Slightly raised neutral dark panel, estimated `#141318`; white in light mode                                                              | from reference (PNG estimate)                                  |
| Ink               | Near-white headings and body text on dark surfaces; near-black on light surfaces                                                          | from reference                                                 |
| Muted text        | Cool neutral gray, kept at WCAG AA contrast for normal text                                                                               | from reference, accessible variant is my decision              |
| Brand accent      | Vivid crimson, visually estimated near `#ed1b40` in the exports                                                                           | from reference (PNG estimate)                                  |
| Accessible action | Darker crimson (`#b90f32` light, `#cf1237` dark) keeps white button labels at 4.5:1 or better                                             | my decision, checked by token contrast tests                   |
| Link accent       | Blue for links and eyebrow labels; adjusted per theme to remain readable                                                                  | from reference; accessible values are my decision              |
| Status colors     | Red for failures, amber for review, green for verified; every state also includes a label and icon or shape                               | from reference; non-color cues are my decision                 |
| Typography        | Inter-like sans serif, compact headings, body copy around 16px, small metadata around 14px, monospace for code                            | from reference; local Inter font and fallbacks are my decision |
| Spacing           | Repeated 8px rhythm with page gutters around 40px on desktop and 20–24px on narrow screens                                                | from reference (PNG estimate)                                  |
| Radius            | Tight 6–10px corners on panels, controls, and buttons                                                                                     | from reference (PNG estimate)                                  |
| Elevation         | Panels are separated by tone and a fine border; no resting-card shadow                                                                    | from reference                                                 |
| Motion            | The exports do not specify motion. Short transitions are used for control feedback; all motion is disabled under `prefers-reduced-motion` | my decision                                                    |

The reference crimson is retained for brand decoration. Text and controls use the accessible crimson variant because white text on the brighter sampled brand color does not reliably meet 4.5:1. The exported gray borders are also subtle; form controls and focus indicators use stronger accessible edges.

## Layout and components

| Area             | Reference treatment                                                                                                                    | Classification                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Shell            | Thin bordered top bar; compact product mark and wordmark; plain navigation; API state, theme control, and account action aligned right | from reference                                    |
| Page grid        | Wide centered canvas, equal outer gutters, two-column hero and results workbench at desktop; stack at phone width                      | from reference                                    |
| Hero             | Large left-aligned headline, concise explanation, clear crimson action, real product issue example at right                            | from reference                                    |
| Workflow         | Four ordered steps: Scan, Understand, Repair, Verify                                                                                   | from reference                                    |
| Panels           | Flat surfaces with 1px outline and restrained padding; avoid decorative gradients and card shadows                                     | from reference                                    |
| Buttons          | Crimson fill for the primary action; dark or neutral outline for secondary actions; clear hover, pressed, disabled, and focus states   | from reference, state behavior is my decision     |
| Inputs           | Dark inset editor surface, persistent labels, visible outline, retained content on errors                                              | from reference                                    |
| Findings         | Severity label and icon, rule reference, plain explanation, affected element, and a visible action                                     | from reference                                    |
| Narrow layout    | Single column; controls wrap or move to a compact menu; tables scroll within their own frame when necessary                            | from reference and product requirements           |
| Preview controls | Before/after modes, marks, and severity filters remain keyboard operable and visible at phone width                                    | my decision for the requested full-screen preview |

## Implementation source

`frontend/src/styles/tokens.js` is the source of truth for the light and dark palettes and foundation values. `frontend/src/lib/theme.js` applies those values before React renders. `frontend/src/index.css` maps the runtime variables into Tailwind's color, type, spacing, radius, elevation, and transition theme. `frontend/src/styles/tokens.test.js` checks the contrast pairs and the mappings.

The system theme remains the default, as requested. `?theme=light`, `?theme=dark`, and the saved theme preference remain supported.

## Workspace and result refinements

These are implementation decisions within the supplied visual direction: a sticky score summary;
preview and issues side by side on desktop; collapsed secondary panels; 16 px explanatory copy;
collision-aware issue marks with severity labels; and a compact, horizontally scrollable crawl table.
The narrow layout stacks the main columns without document-level horizontal scrolling.

## Full-screen comparison

The full-screen view uses a near-black canvas and restrained outlined controls to keep the captured
page legible. It scales the existing 1280 × 720 viewport image, overlays element marks in the same
coordinate space, and provides Slider, Side by side, Before only, and After only modes. Fit/zoom,
pan, issue navigation, severity filters, and mark visibility are grouped with the image; the issue
list becomes a drawer on phones. These controls are my decision because the references do not show a
full-screen comparison.

## Remaining pages and QA

History, business, projects, sign-in, sign-up, reports, shared reports, not-found, and error states
reuse the same shell, spacing, surfaces, and type scale. Print styles retain report content and hide
navigation and action controls. Recharts and Monaco remain lazy; Monaco and its workers are bundled
locally for offline use. Reduced-motion preferences disable route and control animations.

Full-screen evidence: [checkpoint 3 gallery](ui-gallery/README.md#checkpoint-3-full-screen-comparison).
Route and responsive evidence: [checkpoint 4 gallery](ui-gallery/README.md#checkpoint-4-remaining-pages-and-qa).

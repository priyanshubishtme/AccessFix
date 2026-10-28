# Master polish decisions

- Keep System as the theme default. The supplied references are dark, but the requested app behavior is System by default with explicit Light and Dark controls.
- Keep Monaco lazy-loaded and bundle its installed package locally so code views do not depend on a CDN.
- Keep the actual HTML limit at `MAX_HTML_BYTES=5_000_000`, exposed by `/health`; config and live health agree. The older 2 MB wording is stale, so the UI reads the live value rather than changing the backend limit.
- Use locally bundled DM Sans for headings and retain Inter for interface text.
- Crawl discovery is logged as URL, depth, referring page, outcome, and reason. It records anchors found in the rendered DOM, not routes inferred from application JavaScript.
- An optional base URL on pasted HTML is inserted as a `<base>` element before browser rendering. Its requests remain under the existing network guard.
- Existing output contracts are extended with optional/defaulted fields; names and current scan, repair, and verification behavior are preserved.

# Changelog

## Unreleased — AccessFix master polish

- Refined results readability, grouped issue cards, and before/after comparison states and controls.
- Added crawl discovery log/map, pasted HTML base URL, and original-source download.
- Completed public business and sign-in/sign-up flows; corrected live scan limit and sourced public claims.
- Versioned LLM prompts and added one schema-repair retry with safety validation.
- Hardened optional Mongo persistence with page collections, indexes, migration metadata, health ping, and graceful shutdown.
- Rewrote deployment guidance and added `npm run smoke -- <api-url>`.
- Known incomplete items and validation limits are tracked in [docs/15-ui-audit.md](docs/15-ui-audit.md).

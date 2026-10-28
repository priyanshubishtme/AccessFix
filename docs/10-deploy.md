# 10. Deploy and run the demo

AccessFix has two deployable services: a Chromium capable Express API and a static Vite UI. Use separate public origins unless your own edge proxy can route `/api/*` to the API.

## Render services

### API web service

Create a Render **Web Service** from this repository, choose **Docker**, and use the root `Dockerfile`. The image includes Playwright Chromium. Set the health check path to `/health`; the API listens on Render's `PORT`. Choose an instance with at least 1 GB RAM for a demo and more headroom when concurrent scans are expected. This is an operational recommendation for Chromium, not a measured minimum. Configure environment variables from the table below. Keep `STORE=memory` for a disposable demo; use MongoDB Atlas for restart persistence.

Render health checks accept successful 2xx/3xx responses and gate deploy routing. `/health` also reports the browser and store state, so verify `status: "ok"`, `checks.browser: "up"`, and (for Mongo) `checks.storeStatus: "up"` after deploy. Render's health-check behavior is documented at [Health Checks](https://render.com/docs/health-checks).

### Static UI

Create a Render **Static Site** from the same repository:

| Setting | Value |
| --- | --- |
| Root directory | repository root |
| Build command | `npm ci && npm run build -w frontend` |
| Publish directory | `frontend/dist` |
| Environment | `VITE_API_BASE_URL=https://<api-service>.onrender.com` |

Set `VITE_API_BASE_URL` before building; it is public client configuration, never a secret. Add an SPA rewrite `/*` → `/index.html` so routes such as `/history` load directly. Render documents static-site rewrites as serving a path or static destination at the original URL; that is not a reverse proxy to a separate web service. Use a separate API origin and set `CORS_ORIGINS` to the exact UI origin. A same-origin `/api` setup requires an external reverse proxy or a host feature that explicitly proxies requests to another service; do not configure a Render static rewrite as if it were one. See [Static Sites](https://render.com/docs/static-sites) and [Redirects and Rewrites](https://render.com/docs/redirects-rewrites).

### Environment variables

Defaults below are from `backend/src/config/env.js`. Empty strings are treated as unset. Set only the values needed for the chosen deployment; never put secrets in `VITE_*` variables.

| Group | Variable | Default | Production/demo guidance |
| --- | --- | --- | --- |
| API | `PORT` | `4000` | Render sets this. |
| API | `NODE_ENV` | `development` | Render should use `production`. |
| API | `CORS_ORIGINS` | `http://localhost:5173` | Exact comma-separated UI origins. |
| API | `LOG_LEVEL` | `info` | Use `warn` for quieter demo logs. |
| API | `MAX_HTML_BYTES` | `5000000` | JSON request HTML limit (5 MB). |
| API | `SCAN_TIMEOUT_MS` | `30000` | Per scan. |
| API | `REQUEST_TIMEOUT_MS` | `60000` | HTTP request cap. |
| API | `RATE_LIMIT_RPM` | `300` | General per-IP request ceiling. |
| API | `SCAN_RATE_LIMIT_RPM` | `30` | Per-IP scan/write ceiling. |
| API | `BROWSER_MAX_CONTEXTS` | `4` | Reduce on small instances. |
| API | `SCAN_QUEUE_MAX` | `20` | In-process queue cap. |
| API | `NETWORK_IDLE_MAX_MS` | `5000` | Page settle wait cap. |
| Security | `ALLOW_PRIVATE_URLS` | `false` | Must remain false in production. |
| Security | `MAX_RESPONSE_BYTES` | `15000000` | Maximum fetched response size. |
| Security | `MAX_SUBREQUESTS` | `100` | Per-scan subresource cap. |
| Security | `MAX_REDIRECTS` | `5` | URL redirect cap. |
| Security | `SUBREQUEST_TIMEOUT_MS` | `10000` | Resource fetch timeout. |
| Security | `TRUST_PROXY` | `false` | Defaults to true in production; set true behind Render. |
| Security | `COOKIE_SAMESITE` | `lax` | Keep Lax for same-site UI/API. `none` requires HTTPS and sets Secure. |
| Security | `AUTH_STATE_KEYS` | empty | Optional encrypted login-state keys; format `id:<base64-32-byte-key>`. |
| Security | `AUTH_RETENTION_MS` | `900000` | Auth material retention. |
| Security | `LOGIN_IP_PER_HOUR` | `100` | Login attempt limiter. |
| Security | `SIGNUP_IP_PER_HOUR` | `30` | Signup attempt limiter. |
| Store | `STORE` | `memory` | Set `mongo` for persistence. |
| Store | `MONGODB_URI` | empty | Required for Mongo; use Atlas URI and keep it secret. |
| Store | `MONGODB_MAX_POOL_SIZE` | `10` | Connection pool cap, maximum 100. |
| Store | `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `5000` | Fail promptly when Atlas is unreachable. |
| Store | `SCAN_TTL_DAYS` | `30` | Retention for scans and share links. |
| Store | `STORE_MAX_SCANS` | `200` | Memory store cap. |
| Quotas | `QUOTAS_ENABLED` | `false` | Meters count either way; caps enforce only when true. |
| Quotas | `LOGGED_OUT_SCANS_DAY` | `100` | Anonymous daily cap when quotas are enabled. |
| Quotas | `FREE_SCANS_DAY` | `30` | Free account daily cap. |
| Quotas | `FREE_PAGES_DAY` | `100` | Free account page cap. |
| Quotas | `FREE_TOKENS_DAY` | `50000` | Free account token cap. |
| Quotas | `FREE_CRAWL_PAGES` | `5` | Free crawl page cap. |
| Quotas | `PRO_SCANS_DAY` | `300` | Pro account daily cap. |
| Quotas | `PRO_PAGES_DAY` | `1000` | Pro page cap. |
| Quotas | `PRO_TOKENS_DAY` | `300000` | Pro token cap. |
| Quotas | `PRO_CRAWL_PAGES` | `10` | Pro crawl page cap. |
| Quotas | `TOKEN_DAILY_OVERRIDE` | `0` | Optional anonymous token cap override. |
| Quotas | `PRO_EMAILS` | empty | Comma-separated demo Pro accounts; do not use as billing. |
| Crawl | `CRAWL_MAX_PAGES` | `10` | Global cap while quotas are off. |
| Crawl | `CRAWL_MAX_DEPTH` | `2` | Global depth cap. |
| Crawl | `CRAWL_BUDGET_MS` | `180000` | Overall crawl budget. |
| Crawl | `CRAWL_GAP_MS` | `500` | Minimum page pacing. |
| Crawl | `CRAWL_DELAY_CAP_MS` | `5000` | Maximum robots crawl-delay. |
| Crawl | `PAGE_BUDGET_MS` | `15000` | Per page crawl budget. |
| Crawl | `DOM_QUIET_MS` | `500` | DOM quiet window. |
| Crawl | `PAGE_HTML_MAX_BYTES` | `5000000` | Per-page HTML cap. |
| Crawl | `ZIP_MAX_BYTES` | `20000000` | Download archive cap. |
| Crawl | `KEYBOARD_MAX_STOPS` | `50` | Keyboard walk stop cap. |
| Crawl | `CACHE_MAX_BYTES` | `268435456` | HTML cache cap. |
| Screenshots | `SCREENSHOTS` | `true` | Disable to reduce screenshot work. |
| Screenshots | `SCREENSHOT_QUALITY` | `60` | JPEG quality 30–90. |
| Screenshots | `SCREENSHOT_MAX_BYTES` | `500000` | Stored screenshot size cap. |
| Screenshots | `VIEWPORT_WIDTH` | `1280` | Capture viewport width. |
| Screenshots | `VIEWPORT_HEIGHT` | `720` | Capture viewport height. |
| LLM | `LLM_PROVIDER` | `none` | `none`, `mock`, or `openai-compatible`. |
| LLM | `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible provider endpoint. |
| LLM | `LLM_API_KEY` | empty | Secret; omit when AI is off. |
| LLM | `LLM_MODEL_CHEAP` | empty | Model for supported draft tasks. |
| LLM | `LLM_MODEL_STRONG` | empty | Optional stronger model. |
| LLM | `LLM_MODEL_VISION` | empty | Optional vision model; vision is separately disabled by default. |
| LLM | `LLM_PRICE_INPUT_PER_M` | `0` | Optional cost estimate configuration. |
| LLM | `LLM_PRICE_OUTPUT_PER_M` | `0` | Optional cost estimate configuration. |
| LLM | `LLM_TOKEN_BUDGET_PER_SCAN` | `0` | Zero means no per-scan ceiling. |
| LLM | `LLM_TOKEN_BUDGET_PER_IP_DAY` | `100000` | Anonymous per-IP daily token cap. |
| LLM | `LLM_TOKEN_DAILY_CEILING` | `0` | Zero disables the process-wide daily ceiling. Mongo persists its counter. |
| LLM | `LLM_RPM` | `30` | Provider request rate. |
| LLM | `LLM_TPM` | `60000` | Provider token rate. |
| Other | `INCLUDE_AAA` | `false` | Include AAA checks. |
| Other | `REDIS_URL` | empty | Optional queue URL; requires Mongo store. |

## MongoDB Atlas

Set `STORE=mongo`, `MONGODB_URI`, and (optionally) pool and timeout settings. In Atlas Network Access, add the API provider's stable outbound IP range when available. If a short demo requires `0.0.0.0/0` (“allow access from anywhere”), use it for the demo window only, restrict database credentials to the required database and roles, then remove the broad entry immediately. Never commit the URI. Mongo stores scan metadata and page records; screenshots and full source HTML stay outside Mongo. Back up Atlas data before changing retention or indexes. Run the migration at startup by deploying the service and confirm `/health` reports `checks.storeStatus: "up"`.

Local Mongo:

```powershell
docker-compose -f docker-compose.mongo.yml up -d
$env:MONGODB_URI='mongodb://127.0.0.1:27017/accessfix_test'
npm run test:mongo
```

The integration test uses `MONGODB_URI` when set and skips the real-server test otherwise. To stop the local service while preserving its named data volume: `docker-compose -f docker-compose.mongo.yml down`.

## Cookie settings

Prefer a single site or a real same-origin reverse proxy for the UI and `/api`. Keep `COOKIE_SAMESITE=lax` in that setup. A Render static-site rewrite does not proxy `/api` to the API service, so separate Render origins use credentialed CORS and may require `COOKIE_SAMESITE=none`; this also requires HTTPS and produces a Secure cookie. Browser third-party-cookie restrictions can still block cross-site cookies, so test sign-in in the target browsers. Keep `CORS_ORIGINS` exact and set `TRUST_PROXY=true` behind Render.

## Pre-deploy checklist

- [ ] Build succeeds: `npm ci && npm run build`.
- [ ] Run unit and browser tests; install Playwright Chromium in the build/CI environment.
- [ ] Configure CORS, production mode, proxy trust, cookie mode, and public API URL.
- [ ] Keep private URL access disabled; confirm Mongo URI and Atlas network rules if persistent storage is selected.
- [ ] Set the API health check to `/health`, then check browser and store status after deploy.
- [ ] Run the smoke command below against the deployed API and open the UI on desktop and mobile.
- [ ] Confirm the UI has no secret environment variables and reports live limits accurately.

## Smoke test

From the repository root, this performs a health check, a small HTML scan, waits for completion, then downloads the JSON report:

```bash
npm run smoke -- https://<api-service>.onrender.com
```

It exits non-zero on an unhealthy API, failed scan, timeout, or failed report request. It creates one ordinary anonymous scan, which remains subject to the configured scan retention.

## Rollback and demo day

Render retains prior deploys; use the service's Deploys page to redeploy the last known-good deploy if the current version fails. Check `/health` and run the smoke command after rollback. The memory store loses scans when the service restarts and Render may spin down or replace instances depending on the plan. For a live demo, warm the API shortly before the session, run the smoke command, open the broken sample, and keep one completed report ready. If using Mongo, confirm Atlas is reachable and the test scan/report survive an API restart. Avoid changing secrets or schema during the demo window.

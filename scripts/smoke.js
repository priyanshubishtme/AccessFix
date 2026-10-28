const base = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!/^https?:\/\//i.test(base)) {
  console.error('Usage: npm run smoke -- <http(s)://api-host>');
  process.exit(2);
}

async function request(path, init) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30_000), ...init });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${init?.method ?? 'GET'} ${path}: HTTP ${response.status} ${body.slice(0, 500)}`);
  }
  return response;
}

try {
  const health = await (await request('/health')).json();
  if (health.status !== 'ok' || health.checks?.browser !== 'up') {
    throw new Error(`API is not ready: status=${health.status}, browser=${health.checks?.browser}`);
  }
  const accepted = await (await request('/scans', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      input: { type: 'html', html: '<!doctype html><html lang="en"><head><title>AccessFix smoke</title></head><body><main><h1>AccessFix smoke check</h1><p>Smoke scan.</p></main></body></html>' },
      options: { target: 'AA', crawl: false, keyboard: true },
    }),
  })).json();
  const deadline = Date.now() + 90_000;
  let scan;
  do {
    await new Promise((resolve) => setTimeout(resolve, 750));
    scan = await (await request(`/scans/${encodeURIComponent(accepted.id)}`)).json();
    if (scan.status === 'failed') throw new Error(`Scan failed: ${scan.error?.message ?? 'unknown error'}`);
  } while (scan.status !== 'completed' && Date.now() < deadline);
  if (scan.status !== 'completed') throw new Error('Scan did not complete within 90 seconds.');

  const report = await request(`/scans/${encodeURIComponent(accepted.id)}/report?format=json`);
  const reportBody = await report.json();
  if (!reportBody || typeof reportBody !== 'object') throw new Error('Report response was not JSON.');
  console.log(`Smoke passed: health=ok browser=up scan=${accepted.id} report=200 score=${scan.score?.value ?? 'N/A'}`);
} catch (error) {
  console.error(`Smoke failed: ${error.message}`);
  process.exitCode = 1;
}

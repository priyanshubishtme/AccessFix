import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { listScans } from '@/lib/api.js';
import { loadHistory } from '@/lib/historyStore.js';
import { Link } from '@/lib/Link.jsx';
import { ruleText } from '@/lib/rules.js';
import { formatScore } from '@/lib/score.js';
const ScoreTrend = lazy(() =>
  import('./ScoreTrend.jsx').then((module) => ({ default: module.ScoreTrend })),
);

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function frequentIssues(scans) {
  const counts = new Map();
  for (const scan of scans) {
    for (const ruleId of new Set((scan.violations ?? []).map((v) => v.ruleId))) {
      const first = scan.violations.find((v) => v.ruleId === ruleId);
      const row = counts.get(ruleId) ?? { ruleId, n: 0, title: ruleText(ruleId, first).title };
      row.n += 1;
      counts.set(ruleId, row);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title))
    .slice(0, 6);
}

function HistoryList({ entries, query, sort }) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? entries.filter((e) => e.title.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
    : entries;
  const ordered = [...filtered].sort((a, b) => {
    if (sort === 'oldest') return String(a.when).localeCompare(String(b.when));
    if (sort === 'score') return (b.score ?? -1) - (a.score ?? -1);
    return String(b.when).localeCompare(String(a.when));
  });
  if (ordered.length === 0) {
    return <p className="px-5 py-6 text-sm text-muted-foreground">No scans match that search.</p>;
  }
  return (
    <ul className="divide-y">
      {ordered.map((e) => {
        const rules = e.violations ? new Set(e.violations.map((v) => v.ruleId)).size : null;
        const elements = e.violations ? e.violations.length : null;
        return (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{e.title}</p>
              <p className="text-sm text-muted-foreground">
                {e.inputType === 'url' ? 'URL' : 'HTML'}
                {e.standard ? ` · ${e.standard}` : ''}
                {e.when ? ` · ${new Date(e.when).toLocaleString()}` : ''}
                {rules != null ? ` · ${rules} failing ${rules === 1 ? 'rule' : 'rules'}` : ''}
                {elements != null
                  ? ` · ${elements} ${elements === 1 ? 'element' : 'elements'}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-5">
              <p className="tabular text-right text-sm">
                <span className="text-lg font-semibold">{formatScore(e.score)}</span>
                {e.after != null && <span className="text-verified"> → {e.after}</span>}
              </p>
              <Link
                href={`/scans/${e.id}/report`}
                className="text-sm font-medium text-link underline"
              >
                Open report
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function History() {
  const stored = useMemo(() => loadHistory(), []);
  const [scans, setScans] = useState([]);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    const ids = stored.map((e) => e.id);
    if (!ids.length) return;
    listScans(ids)
      .then((body) => setScans(body.scans ?? []))
      .catch((err) => setError(err));
  }, [stored]);

  const live = new Map(scans.map((s) => [s.id, s]));
  const entries = stored.map((e) => {
    const s = live.get(e.id);
    return {
      id: e.id,
      when: s?.createdAt ?? e.createdAt ?? e.when ?? '',
      score: s?.score?.value ?? e.score ?? null,
      after: e.after ?? null,
      title: s?.page?.title || s?.page?.finalUrl || s?.input?.url || e.label || 'Pasted HTML',
      violations: s?.violations ?? null,
      inputType: s?.input?.type ?? 'html',
      standard: s?.score?.standard ?? null,
      verified: e.after ?? null,
    };
  });
  const chronological = [...entries].reverse();
  const initial = entries.map((e) => e.score).filter((v) => v != null);
  const gains = entries
    .filter((e) => e.after != null && e.score != null)
    .map((e) => e.after - e.score);
  const latest = entries.find((e) => e.violations);
  const openIssues = latest ? new Set(latest.violations.map((v) => v.ruleId)).size : null;

  const frequent = frequentIssues(scans);
  const maxN = frequent[0]?.n ?? 1;

  const avgGain = mean(gains);
  const kpis = [
    { label: 'Scans run', value: entries.length, note: 'In this browser' },
    {
      label: 'Average initial score',
      value: initial.length ? Math.round(mean(initial)) : '—',
      note: 'Automated A/AA checks',
    },
    {
      label: 'Average gain after fixes',
      value: avgGain == null ? '—' : `${avgGain >= 0 ? '+' : ''}${Math.round(avgGain)}`,
      note: gains.length
        ? `${gains.length} verified ${gains.length === 1 ? 'scan' : 'scans'}`
        : 'No verified fixes yet',
    },
    { label: 'Open issues', value: openIssues ?? '—', note: 'Rules failing in the latest scan' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scan history</h1>
        <p className="mt-1 max-w-[75ch] text-base leading-7 text-muted-foreground">
          This list is stored in this browser. Sign in to keep scans on your account as well. The
          server will not list anyone else’s work. Shared report links still work for anyone who has
          the id, and expire after 30 days. Scores from different WCAG targets or crawl scopes are
          not comparable.
        </p>
      </div>
      {error && (
        <p className="text-critical" role="alert">
          {error.message}
        </p>
      )}
      {entries.length === 0 ? (
        <div className="rounded-xl border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No scans yet.</p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground no-underline"
          >
            Run one
          </Link>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="bg-surface px-5 py-4">
                <dt className="text-sm text-muted-foreground">{k.label}</dt>
                <dd className="tabular mt-1 text-3xl font-semibold tracking-tight">{k.value}</dd>
                <dd className="mt-1 text-xs text-muted-foreground">{k.note}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
            <section
              aria-labelledby="trend-heading"
              className="rounded-xl border bg-surface p-5 sm:p-6"
            >
              <h2 id="trend-heading" className="text-base font-semibold">
                Score trend
              </h2>
              <div className="mt-4 min-h-64">
                <Suspense
                  fallback={
                    <div
                      className="grid h-64 place-items-center rounded-lg bg-background text-sm text-muted-foreground"
                      role="status"
                    >
                      Loading score chart…
                    </div>
                  }
                >
                  <ScoreTrend points={chronological} />
                </Suspense>
              </div>
            </section>
            <section
              aria-labelledby="frequent-heading"
              className="rounded-xl border bg-surface p-5 sm:p-6"
            >
              <h2 id="frequent-heading" className="text-base font-semibold">
                Most frequent issues
              </h2>
              {frequent.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No failing rules in the scans still stored.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {frequent.map((row) => (
                    <li key={row.ruleId}>
                      <div className="flex items-baseline justify-between gap-3 text-base">
                        <span>{row.title}</span>
                        <span className="tabular shrink-0 font-semibold">
                          {row.n} {row.n === 1 ? 'scan' : 'scans'}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-raised" aria-hidden="true">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${(row.n / maxN) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section aria-labelledby="list-heading" className="rounded-xl border bg-surface">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4">
              <h2 id="list-heading" className="text-base font-semibold">
                All scans
              </h2>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  Search
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="mt-1 block min-h-10 rounded-md border bg-background px-3 text-sm"
                    placeholder="Name or URL"
                  />
                </label>
                <label className="text-sm">
                  Sort
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className="mt-1 block min-h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="score">Score</option>
                  </select>
                </label>
              </div>
            </div>
            <HistoryList entries={entries} query={query} sort={sort} />
          </section>
        </>
      )}
    </div>
  );
}

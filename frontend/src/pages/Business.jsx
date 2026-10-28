import { Check, Minus } from 'lucide-react';

const fmt = (n) => (n == null ? '—' : new Intl.NumberFormat().format(n));

const FEATURES = [
  ['Paste HTML, upload HTML + CSS, scan one URL', true, true, true],
  ['Fixes, verification, shareable report', true, true, true],
  ['Crawl a whole site', false, true, true],
  ['Scan a page behind a login', false, true, true],
  ['Projects and saved scans', false, true, true],
  ['Revocable share links', false, true, true],
];
const PRICING = [
  ['Free', '$0', 'Illustrative', 'HTML + one URL; local history'],
  ['Pro', '$19 / mo (₹1,499)', 'Illustrative', 'Saved projects, crawls and login-state scans'],
  ['Team', '$79 / mo for 5 seats (₹5,999)', 'Illustrative', 'Shared workflow (hypothesis)'],
  ['Enterprise', 'Custom, from ~$500 / mo', 'Illustrative', 'Enterprise support (hypothesis)'],
];

export function Business({ health }) {
  const quotasOn = health?.quotas === 'on';
  const plans = health?.plans;
  const rows = [
    ['Scans per day', plans?.loggedOutScansDay, plans?.free.scansDay, plans?.pro.scansDay],
    ['Pages per day', null, plans?.free.pagesDay, plans?.pro.pagesDay],
    ['AI tokens per day', null, plans?.free.tokensDay, plans?.pro.tokensDay],
    ['Pages per crawl', null, plans?.free.crawlPages, plans?.pro.crawlPages],
  ];
  return (
    <div className="space-y-8">
      <div className="max-w-[75ch]">
        <h1 className="text-2xl font-semibold tracking-tight">
          Plans, limits and the business case
        </h1>
        <p className="mt-2 text-base leading-7 text-muted-foreground">
          The limits below are read from this server right now. Prices further down are hypotheses
          to test, not findings.
        </p>
      </div>

      <section aria-labelledby="limits-now" className="rounded-xl border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="limits-now" className="text-lg font-semibold">
            Limits on this server
          </h2>
          <p
            className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm ${quotasOn ? 'border-verified text-verified' : 'text-muted-foreground'}`}
            role="status"
          >
            Quotas {quotasOn ? 'on: limits are enforced' : 'off: limits are shown, not enforced'}
          </p>
        </div>
        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">Daily limits by plan</caption>
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Limit
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Signed out
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Free
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, out, free, pro]) => (
                <tr key={name} className="border-b">
                  <th scope="row" className="py-2.5 pr-3 font-medium">
                    {name}
                  </th>
                  <td className="tabular py-2.5 pr-3 text-right">
                    {out == null ? '—' : `${fmt(out)} per network`}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right">{fmt(free)}</td>
                  <td className="tabular py-2.5 text-right">{fmt(pro)}</td>
                </tr>
              ))}
              {FEATURES.map(([name, out, free, pro]) => (
                <tr key={name} className="border-b last:border-b-0">
                  <th scope="row" className="py-2.5 pr-3 font-medium">
                    {name}
                  </th>
                  {[out, free, pro].map((yes, i) => (
                    <td key={i} className={`py-2.5 text-right ${i < 2 ? 'pr-3' : ''}`}>
                      {yes ? (
                        <Check aria-hidden="true" className="ml-auto size-4 text-verified" />
                      ) : (
                        <Minus
                          aria-hidden="true"
                          className="ml-auto size-4 text-muted-foreground"
                        />
                      )}
                      <span className="sr-only">{yes ? 'Included' : 'Not included'}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 grid gap-3 md:hidden">
          {rows.map(([name, out, free, pro]) => (
            <li key={name} className="rounded-lg border bg-background p-3">
              <h3 className="font-semibold">{name}</h3>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <span>
                  Signed out
                  <br />
                  <b>{out == null ? '—' : fmt(out)}</b>
                </span>
                <span>
                  Free
                  <br />
                  <b>{fmt(free)}</b>
                </span>
                <span>
                  Pro
                  <br />
                  <b>{fmt(pro)}</b>
                </span>
              </div>
            </li>
          ))}
          {FEATURES.map(([name, out, free, pro]) => (
            <li key={name} className="rounded-lg border bg-background p-3">
              <h3 className="font-medium">{name}</h3>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <span>
                  Signed out
                  <br />
                  <b>{out ? 'Included' : 'Not included'}</b>
                </span>
                <span>
                  Free
                  <br />
                  <b>{free ? 'Included' : 'Not included'}</b>
                </span>
                <span>
                  Pro
                  <br />
                  <b>{pro ? 'Included' : 'Not included'}</b>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Daily counters reset at midnight UTC. With quotas off, every account crawls up to{' '}
          {fmt(health?.crawl?.maxPages)} pages, {fmt(health?.crawl?.maxDepth)} clicks deep. The
          largest page we accept is{' '}
          {health ? `${(health.limits.maxHtmlBytes / 1_000_000).toFixed(1)} MB` : '—'} of HTML.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="problem-h" className="rounded-xl border bg-surface p-5 sm:p-6">
          <h2 id="problem-h" className="text-lg font-semibold">
            Problem
          </h2>
          <p className="mt-2 text-base leading-7">
            In its February 2026 sample, WebAIM found detectable WCAG 2 failures on 95.9% of the top
            million home pages. Automated results are only part of accessibility review. The FTC&apos;s
            final order against accessiBe required a $1 million payment and restricted unsupported
            claims that automated tools make websites compliant.{' '}
            <a
              className="text-link underline"
              href="https://webaim.org/projects/million/"
              target="_blank"
              rel="noreferrer"
            >
              WebAIM 2026 report
            </a>{' '}
            ·{' '}
            <a
              className="text-link underline"
              href="https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million"
              target="_blank"
              rel="noreferrer"
            >
              FTC final order
            </a>
            .
          </p>
        </section>
        <section aria-labelledby="solution-h" className="rounded-xl border bg-surface p-5 sm:p-6">
          <h2 id="solution-h" className="text-lg font-semibold">
            Solution
          </h2>
          <p className="mt-2 text-base leading-7">
            AccessFix ends in verified source patches. Deterministic fixers first, optional AI only
            for wording, templates if the model is off or over budget. A fix is “verified” only
            after a re-scan with zero regressions. We never sell compliance.
          </p>
        </section>
      </div>
      <section aria-labelledby="how-h" className="rounded-xl border bg-surface p-5 sm:p-6">
        <h2 id="how-h" className="text-lg font-semibold">
          How it works
        </h2>
        <ol className="mt-3 grid gap-3 text-base leading-7 sm:grid-cols-3">
          <li className="rounded-lg border bg-background p-4">
            <span className="font-semibold">1. Scan</span>
            <br />
            Run checks against a rendered page or crawl the same host.
          </li>
          <li className="rounded-lg border bg-background p-4">
            <span className="font-semibold">2. Review</span>
            <br />
            Read grouped findings and inspect proposed code changes.
          </li>
          <li className="rounded-lg border bg-background p-4">
            <span className="font-semibold">3. Verify</span>
            <br />
            Apply selected fixes and rerun automated checks on the patched copy.
          </li>
        </ol>
        <a
          href="/signup"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground no-underline"
        >
          Create an account
        </a>
      </section>

      <section aria-labelledby="usp-h" className="rounded-xl border bg-surface p-5 sm:p-6">
        <h2 id="usp-h" className="text-lg font-semibold">What AccessFix adds to an automated scan</h2>
        <div className="mt-3 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <caption className="sr-only">AccessFix compared with a findings-only scan</caption>
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 pr-3">Step</th><th className="py-2 pr-3">AccessFix</th><th className="py-2">Findings-only scan</th></tr></thead>
            <tbody>
              <tr className="border-b"><th scope="row" className="py-2 pr-3 text-left">Understand</th><td className="py-2 pr-3">Grouped findings in plain language</td><td className="py-2">Automated findings</td></tr>
              <tr className="border-b"><th scope="row" className="py-2 pr-3 text-left">Change</th><td className="py-2 pr-3">Reviewable HTML/CSS patches where supported</td><td className="py-2">Not included in this workflow</td></tr>
              <tr><th scope="row" className="py-2 pr-3 text-left">Check result</th><td className="py-2 pr-3">Re-scan the patched copy for automated regressions</td><td className="py-2">Not included in this workflow</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-3 grid gap-3 sm:hidden">
          <li className="rounded-lg border bg-background p-3"><h3 className="font-semibold">Understand</h3><p className="mt-1 text-sm">AccessFix: grouped findings in plain language</p><p className="mt-1 text-sm text-muted-foreground">Findings-only: automated findings</p></li>
          <li className="rounded-lg border bg-background p-3"><h3 className="font-semibold">Change</h3><p className="mt-1 text-sm">AccessFix: reviewable HTML/CSS patches where supported</p><p className="mt-1 text-sm text-muted-foreground">Findings-only: not included in this workflow</p></li>
          <li className="rounded-lg border bg-background p-3"><h3 className="font-semibold">Check result</h3><p className="mt-1 text-sm">AccessFix: re-scan patched copy for automated regressions</p><p className="mt-1 text-sm text-muted-foreground">Findings-only: not included in this workflow</p></li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">Automated re-checks do not certify a page or replace disabled-person testing.</p>
      </section>

      <section aria-labelledby="pricing-h" className="rounded-xl border bg-surface p-5 sm:p-6">
        <h2 id="pricing-h" className="text-lg font-semibold">
          Pricing (hypothesis)
        </h2>
        <div className="mt-3 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="mb-2 text-left text-sm text-muted-foreground">
              Pricing hypothesis. This table is not the quota the server enforces.
            </caption>
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Tier
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Price
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Scans
                </th>
                <th scope="col" className="py-2 font-medium">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {PRICING.map((row) => (
                <tr key={row[0]} className="border-b align-top last:border-b-0">
                  <th scope="row" className="py-2.5 pr-3 font-semibold">
                    {row[0]}
                  </th>
                  {row.slice(1).map((cell) => (
                    <td key={cell} className="py-2.5 pr-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 grid gap-3 sm:hidden">
          {PRICING.map(([tier, price, scans, notes]) => (
            <li key={tier} className="rounded-lg border bg-background p-3">
              <h3 className="font-semibold">{tier}</h3>
              <p className="mt-1 text-sm">
                {price} · {scans}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{notes}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="road-h" className="rounded-xl border bg-surface p-5 sm:p-6">
          <h2 id="road-h" className="text-lg font-semibold">
            Roadmap
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-7">
            <li>
              Crawler, SPA wait, login-state scans, keyboard checks, accounts and quotas — shipped.
            </li>
            <li>Source mapping back to JSX — not built.</li>
            <li>
              GitHub Action with <code className="font-mono">--fail-under 90</code> and{' '}
              <code className="font-mono">--fail-on-regression</code> — not built.
            </li>
          </ul>
        </section>
        <section aria-labelledby="honest-h" className="rounded-xl border bg-surface p-5 sm:p-6">
          <h2 id="honest-h" className="text-lg font-semibold">
            Honest limitations
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-7">
            <li>Automated checks cover only part of WCAG. A 100 is not compliance.</li>
            <li>We patch rendered HTML/CSS, not your React source — yet.</li>
            <li>AI drafts are words only and stay needs-review until you accept them.</li>
            <li>The product works with the LLM turned off.</li>
            <li>No password reset and no email verification yet.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

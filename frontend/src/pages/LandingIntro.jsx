import { ArrowRight, CircleCheck, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card.jsx';
import selfScan from '@/generated/self-scan.json';

const STEPS = [
  { title: 'Scan', body: 'Inspect a page in an isolated browser.' },
  { title: 'Fix', body: 'Review targeted changes to your source.' },
  { title: 'Verify', body: 'Re-scan and check for regressions.' },
  { title: 'Rescan', body: 'See what changed and what still needs attention.' },
];

const ROWS = [
  {
    name: 'AccessFix',
    tells: 'Yes, in plain language',
    source: 'Yes — verified patches to your HTML/CSS',
    rescan: 'Yes, every accepted fix',
    overlay: 'Never',
    claim: 'Never claims compliance',
  },
  {
    name: 'axe / Lighthouse',
    tells: 'Yes, as rule IDs',
    source: 'No',
    rescan: 'You re-run it yourself',
    overlay: 'No',
    claim: 'Does not claim compliance',
  },
  {
    name: 'Overlay widgets',
    tells: 'A toolbar on top of the page',
    source: 'No — the source stays broken',
    rescan: 'No',
    overlay: 'Yes, that is the product',
    claim: 'Often overclaims (see FTC / accessiBe)',
  },
];

export function LandingIntro() {
  return (
    <>
      <section
        aria-labelledby="hero-heading"
        className="grid min-w-0 items-center gap-8 py-2 sm:gap-10 sm:py-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-link">Accessibility, engineered.</p>
          <h1
            id="hero-heading"
            className="mt-5 max-w-[14ch] text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-balance"
          >
            Other tools tell you your site is broken. AccessFix fixes it.
          </h1>
          <p className="mt-5 max-w-[58ch] text-base leading-7 text-muted-foreground">
            Inspect a real page, review targeted repairs, and verify every accepted change with
            another scan.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#scan-form"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground no-underline transition-[filter,transform] hover:brightness-110 active:translate-y-px"
            >
              Scan a website <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center rounded-md border border-input bg-surface px-4 text-sm font-medium text-foreground no-underline transition-colors hover:bg-raised"
            >
              Explore the workflow
            </a>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Automated findings + human review. No compliance shortcuts.
          </p>
        </div>

        <div className="min-w-0">
          <p className="mb-3 text-sm font-semibold text-muted-foreground">
            The inspection workbench
          </p>
          <SampleFinding />
          <p className="mt-3 text-sm text-muted-foreground">
            Illustrative workflow · Not a live scan
          </p>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="workflow-heading" className="mt-10 sm:mt-14">
        <h2 id="workflow-heading" className="mb-4 text-sm font-semibold text-link">
          From finding to confidence
        </h2>
        <ol
          className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="How AccessFix works"
        >
          {STEPS.map((step, i) => (
            <li key={step.title} className="min-w-0 rounded-lg border bg-surface p-4 sm:p-5">
              <span aria-hidden="true" className="tabular text-sm text-muted-foreground">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-[32ch] text-sm leading-6 text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/** A real fragment of the product's issue card, filled with sample data. */
export function SampleFinding() {
  return (
    <figure className="min-w-0 rounded-lg border bg-surface p-4 sm:p-5" data-ui>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-critical">
          <TriangleAlert aria-hidden="true" className="size-4" />
          Critical
        </span>
        <span className="text-muted-foreground">WCAG 4.1.2 · A</span>
      </div>
      <p className="mt-3 text-lg font-semibold">Button has no accessible name</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Screen readers announce only “button”, so people cannot tell what it does.
      </p>
      <pre className="mt-4 max-w-full overflow-x-auto rounded-md border border-input bg-background p-3 font-mono text-[13px] leading-6">
        <code>
          <span className="block text-critical">- &lt;button class=&quot;menu&quot;&gt;</span>
          <span className="block text-verified">
            + &lt;button class=&quot;menu&quot; aria-label=&quot;Open menu&quot;&gt;
          </span>
        </code>
      </pre>
      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-verified">
          <CircleCheck aria-hidden="true" className="size-4" />
          Verified by re-scan · 0 regressions
        </span>
        <span className="text-muted-foreground">Sample data</span>
      </figcaption>
    </figure>
  );
}

export function LandingProof() {
  const when = new Date(selfScan.generatedAt).toISOString().slice(0, 10);
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card aria-labelledby="compare-heading" className="min-w-0 p-5 sm:p-6">
        <h2 id="compare-heading" className="text-lg font-semibold">
          What you actually take home
        </h2>
        <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">
              AccessFix compared with axe or Lighthouse and overlay widgets
            </caption>
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Product
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Explains issues
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Changes your source
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Verified re-scan
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Overlay
                </th>
                <th scope="col" className="py-2 font-medium">
                  Claims compliance
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.name} className="border-b align-top last:border-b-0">
                  <th scope="row" className="py-3 pr-3 font-semibold">
                    {row.name}
                  </th>
                  <td className="py-3 pr-3">{row.tells}</td>
                  <td className="py-3 pr-3">{row.source}</td>
                  <td className="py-3 pr-3">{row.rescan}</td>
                  <td className="py-3 pr-3">{row.overlay}</td>
                  <td className="py-3">{row.claim}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Scroll the comparison table horizontally on narrow screens.
        </p>
      </Card>

      <Card aria-labelledby="proof-heading" className="min-w-0 p-5 sm:p-6">
        <h2 id="proof-heading" className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck aria-hidden="true" className="size-5 text-verified" />
          This UI, scanned by AccessFix
        </h2>
        <p className="mt-3 text-sm leading-6">
          As of {when}: <strong>no automated violations found</strong>
          {selfScan.score != null ? ` (automated score ${selfScan.score})` : ''}. That is not a WCAG
          conformance claim — it only covers what axe-core can detect.
        </p>
        {selfScan.manualReview.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Needs manual review:</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {selfScan.manualReview.map((item, index) => (
                <li key={`${item.ruleId}-${index}`}>
                  {item.title} ({item.ruleId})
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing was flagged for manual review in that scan.
          </p>
        )}
      </Card>
    </div>
  );
}

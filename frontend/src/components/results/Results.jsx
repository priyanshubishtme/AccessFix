import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, Globe, Info, LoaderCircle, ShieldOff, Sparkles } from 'lucide-react';
import { Alert } from '@/components/ui/alert.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ErrorPanel } from '@/components/ErrorPanel.jsx';
import { useRepairs } from '@/hooks/useRepairs.js';
import { useSeverityParam } from '@/hooks/useSeverityParam.js';
import { getScan, pagesZipUrl } from '@/lib/api.js';
import { updateHistory } from '@/lib/historyStore.js';
import { Link } from '@/lib/Link.jsx';
import { visualOn } from '@/lib/flags.js';
import { buildPreviewModel, scrollIssueIntoPane } from '@/lib/markLayout.js';
import { applicableRepairs, bandOf, scoreDisclaimer } from '@/lib/score.js';
import { scanTarget, standardLabel, targetNote } from '@/lib/target.js';
import { SEVERITIES, groupByRule } from '@/lib/severity.js';
import { ChecksPanel } from './ChecksPanel.jsx';
import { ColorPanel } from './ColorPanel.jsx';
import { CrawlPages } from './CrawlPages.jsx';
import { HeadingOutline } from './HeadingOutline.jsx';
import { LogPanel } from './LogPanel.jsx';
import { IssueGroup } from './IssueGroup.jsx';
import { PatchedCode } from './PatchedCode.jsx';
import { ScoreExplain } from './ScoreExplain.jsx';
import { ScoreMeter } from './ScoreMeter.jsx';
import { SeverityFilter } from './SeverityFilter.jsx';
import { VerificationPanel } from './VerificationPanel.jsx';
import { KeyboardPanel, ScreenReaderTable } from './Simulators.jsx';
import { Workbench } from './Workbench.jsx';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function ScoreCard({ scan, verification, headingRef, repairs }) {
  const score = verification?.after ?? scan.score;
  const target = scanTarget(scan.options);
  const standard = score?.standard ?? standardLabel(target);
  const previous = verification ? verification.before : null;
  const source =
    scan.input.type === 'url'
      ? (scan.page?.finalUrl ?? scan.input.url)
      : `Pasted HTML (${(scan.input.bytes / 1024).toFixed(1)} KB)`;
  const issues = groupByRule(scan.violations).length;
  const people = scan.manualReview.length;
  const peopleLine =
    people === 1 ? '1 needs a person to check' : `${people} need a person to check`;
  const proposed = repairs?.repairs ?? [];
  const automatic = proposed.filter(
    (item) => item.strategy === 'deterministic' && item.status !== 'manual-review',
  ).length;
  const drafts = proposed.filter(
    (item) => item.strategy === 'llm' || item.strategy === 'template',
  ).length;
  return (
    <div className="rounded-xl border bg-surface p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <div>
          <h2
            ref={headingRef}
            id="score-heading"
            tabIndex={-1}
            className="text-sm font-medium text-muted-foreground"
          >
            Accessibility score
          </h2>
          <div className="mt-3">
            <ScoreMeter score={score} previous={previous} />
          </div>
        </div>
        <div className="min-w-0 lg:border-l lg:pl-6">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">
              {scan.page?.title ? `${scan.page.title} · ` : ''}
              {source}
            </span>
          </p>
          <p className="mt-2 text-sm">
            Target <span className="font-semibold">{standard}</span>
            <span className="text-muted-foreground"> · {targetNote(target)}</span>
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {plural(issues, 'WCAG issue')}{' '}
            <span className="text-base font-normal text-muted-foreground">
              ({plural(scan.violations.length, 'failing element')})
            </span>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Severity counts are shown in the sticky summary above.
          </p>
          <p className="mt-4 max-w-[65ch] text-sm leading-6">
            {proposed.length === 0
              ? `${peopleLine}. Suggest fixes to see how many can be applied automatically.`
              : `${automatic} can be applied automatically. ${drafts} ${drafts === 1 ? 'is a draft' : 'are drafts'} to review. ${peopleLine}.`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {plural(scan.manualReview.length, 'item')}{' '}
            {scan.manualReview.length === 1 ? 'needs' : 'need'} manual review ·{' '}
            {plural(scan.advisory.length, 'advisory note')}
            {scan.timings.totalMs != null &&
              ` · scanned in ${(scan.timings.totalMs / 1000).toFixed(1)} s`}
          </p>
          <p className="mt-3 max-w-[65ch] text-sm leading-6 text-muted-foreground">
            {scoreDisclaimer(standard)}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/scans/${scan.id}/report`}
              className="text-sm font-medium text-link underline"
            >
              Open shareable report
            </Link>
            <a href={pagesZipUrl(scan.id)} className="text-sm font-medium text-link underline">
              Download page (ZIP)
            </a>
            <span className="text-sm text-muted-foreground">
              Anyone with the report link can view it. Links expire after 30 days. The ZIP holds the
              original HTML, and the patched copy after you apply fixes.
            </span>
          </p>
          {score && <ScoreExplain score={score} />}
        </div>
      </div>
    </div>
  );
}

function StickyScoreSummary({ scan, verification, repairs }) {
  const score = verification?.after ?? scan.score;
  const band = bandOf(score?.value);
  const proposed = repairs?.repairs ?? [];
  const automatic = proposed.filter(
    (item) => item.strategy === 'deterministic' && item.status !== 'manual-review',
  ).length;
  const counts = scan.violations.reduce((acc, item) => {
    acc[item.impact] = (acc[item.impact] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <aside
      className="sticky top-16 z-20 -mx-1 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:top-24"
      aria-label="Sticky scan summary"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          role="img"
          aria-label={`Accessibility score ${score?.value ?? 'not available'} out of 100`}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border-[3px] border-current text-base font-semibold tabular-nums ${band.className}`}
        >
          {score?.value ?? '—'}
        </div>
        <ul
          className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1 text-sm"
          aria-label="Issues by severity"
        >
          {SEVERITIES.map((item) => (
            <li key={item.value} className="inline-flex items-center gap-1.5">
              <item.Icon aria-hidden="true" className={`size-4 ${item.className.split(' ')[0]}`} />
              <span>{item.label}</span>
              <span className="font-semibold tabular-nums">{counts[item.value] ?? 0}</span>
            </li>
          ))}
        </ul>
        <div className="flex w-full flex-wrap gap-x-4 gap-y-1 border-t pt-1 text-sm sm:w-auto sm:border-0 sm:pt-0">
          <span>
            {repairs.phase === 'idle'
              ? 'Run Suggest fixes to find out'
              : repairs.phase === 'proposing'
                ? 'Finding automatic fixes…'
                : `${automatic} fixable automatically`}
          </span>
          <span>{scan.manualReview.length} need review</span>
        </div>
      </div>
    </aside>
  );
}

function formatCount(n) {
  return new Intl.NumberFormat().format(n);
}

function EfficiencyPanel({ usage }) {
  if (!usage) return null;
  if (!usage.calls && !usage.naiveEstimateTokens && !usage.cacheHits) return null;
  const naiveLine = `A naive one-call-per-issue approach would have used about ${formatCount(usage.naiveEstimateTokens)} tokens.`;
  return (
    <aside className="rounded-xl border bg-surface p-4" aria-labelledby="efficiency-heading">
      <h3 id="efficiency-heading" className="text-sm font-semibold">
        Efficiency
      </h3>
      <p className="mt-2 text-sm">
        {formatCount(usage.totalTokens)} tokens used · {formatCount(usage.tokensSaved)} saved ·{' '}
        {formatCount(usage.cacheHits)} cache {usage.cacheHits === 1 ? 'hit' : 'hits'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{naiveLine}</p>
    </aside>
  );
}

function FixBar({
  scan,
  repairs,
  llmOff,
  llmPaused,
  useAi,
  onUseAi,
  proposing,
  applying,
  onPropose,
  onApply,
}) {
  const applicable = applicableRepairs(repairs.repairs, repairs.drafts, repairs.acceptedIds);
  const busy = proposing || applying;
  const canFix = scan.violations.length + scan.advisory.length > 0;
  return (
    <div className="space-y-3 rounded-xl border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-base font-semibold">Fix the page</h2>
          <p className="text-sm text-muted-foreground">
            Rule-based patches first. Every applied fix is re-scanned before it counts.
          </p>
        </div>
        {!llmOff && !llmPaused && (
          <label className="inline-flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => onUseAi(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Use AI drafts
          </label>
        )}
        {canFix && (
          <Button onClick={() => onPropose()} disabled={busy} aria-busy={proposing}>
            {proposing ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Sparkles aria-hidden="true" className="size-4" />
            )}
            {proposing ? 'Finding fixes…' : 'Suggest fixes'}
          </Button>
        )}
        {repairs.repairs.length > 0 && (
          <Button
            variant="outline"
            onClick={onApply}
            disabled={busy || (applicable.length === 0 && repairs.rejectedIds.size === 0)}
            aria-busy={applying}
          >
            {applying ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <CircleCheck aria-hidden="true" className="size-4" />
            )}
            {applying ? 'Verifying…' : 'Apply verified fixes'}
          </Button>
        )}
      </div>
      {llmOff && (
        <Alert tone="info" icon={Info} role="note">
          AI suggestions are off. Rule-based fixes still work.
        </Alert>
      )}
      {llmPaused && (
        <Alert tone="info" icon={Info} role="note">
          AI suggestions paused. Showing templates you can fill in.
        </Alert>
      )}
      {repairs.summary?.needsInput > 0 && (
        <Alert tone="info" icon={Info} role="status">
          {plural(repairs.summary.needsInput, 'fix')}{' '}
          {repairs.summary.needsInput === 1 ? 'needs' : 'need'} your input.{' '}
          <a href="#issues-heading" className="font-medium text-link underline">
            Review them
          </a>
        </Alert>
      )}
      {repairs.summary && (
        <p role="status" className="text-sm text-muted-foreground">
          {[
            `${repairs.summary.verified} verified`,
            repairs.summary.needsInput
              ? `${repairs.summary.needsInput} ${repairs.summary.needsInput === 1 ? 'needs' : 'need'} your input`
              : null,
            repairs.summary.manual ? `${repairs.summary.manual} manual` : null,
            repairs.summary.failed ? `${repairs.summary.failed} still failing` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}

function Section({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className="mt-8 first:mt-0">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SecondaryDisclosure({ title, children }) {
  return (
    <details className="rounded-xl border bg-surface p-5 sm:p-6">
      <summary className="min-h-10 cursor-pointer text-lg font-semibold marker:text-muted-foreground">
        {title}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function useManualChecks(scanId) {
  const key = `accessfix.manual.${scanId}`;
  const [checked, setChecked] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]'));
    } catch {
      return new Set();
    }
  });
  const toggle = useCallback(
    (ruleId) =>
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(ruleId)) next.delete(ruleId);
        else next.add(ruleId);
        try {
          localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          /* private mode: the checklist still works for this visit */
        }
        return next;
      }),
    [key],
  );
  return [checked, toggle];
}

function SectionNav({ items }) {
  return (
    <nav
      aria-label="Result sections"
      className="-mx-4 border-b bg-background/95 px-4 py-2 lg:sticky lg:top-36 lg:z-30 lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0"
    >
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              onClick={() => {
                const target = document.getElementById(item.id);
                target?.closest('details')?.setAttribute('open', '');
              }}
              className="flex min-h-10 items-center justify-between gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-raised hover:text-foreground"
            >
              <span>{item.label}</span>
              {item.count != null && (
                <span className="tabular rounded bg-raised px-1.5 text-xs font-medium text-foreground">
                  {item.count}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * @param {{ scan: import('@/lib/api.js').Scan, health?: import('@/lib/api.js').Health | null,
 *   onNewScan?: () => void }} props
 */
export function Results({ scan, health = null, onNewScan }) {
  const headingRef = useRef(null);
  const [severity, setSeverity] = useSeverityParam();
  const [useAi, setUseAi] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [highlightIds, setHighlightIds] = useState([]);
  const [colorFilter, setColorFilter] = useState(null);
  const [freshShots, setFreshShots] = useState(null);
  const [manualChecked, toggleManual] = useManualChecks(scan.id);
  const llmOn = health?.checks.llm === 'on';
  const llmPaused = health?.checks.llm === 'circuit-open';
  const repairs = useRepairs(scan.id, { useLlm: llmOn && useAi });

  useEffect(() => headingRef.current?.focus(), [scan.id]);

  useEffect(() => {
    if (highlightIds.length !== 1) return;
    scrollIssueIntoPane(highlightIds[0]);
  }, [highlightIds]);

  useEffect(() => {
    if (!repairs.verification) return undefined;
    updateHistory(scan.id, { after: repairs.verification.after?.value ?? null });
    const ctrl = new AbortController();
    getScan(scan.id, ctrl.signal)
      .then((fresh) => setFreshShots(fresh.shots ?? null))
      .catch(() => {});
    return () => ctrl.abort();
  }, [repairs.verification, scan.id]);

  const groups = useMemo(() => groupByRule(scan.violations), [scan.violations]);
  const counts = useMemo(
    () => groups.reduce((acc, g) => ({ ...acc, [g.impact]: (acc[g.impact] ?? 0) + 1 }), {}),
    [groups],
  );
  const [issueQuery, setIssueQuery] = useState('');
  const deferredQuery = useDeferredValue(issueQuery);
  const visible = useMemo(() => {
    const bySeverity = severity.length ? groups.filter((g) => severity.includes(g.impact)) : groups;
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return bySeverity;
    return bySeverity.filter(
      (g) =>
        g.ruleId.toLowerCase().includes(q) ||
        g.first.title.toLowerCase().includes(q) ||
        (g.first.wcag?.refs ?? []).some((r) => `${r.sc} ${r.name}`.toLowerCase().includes(q)),
    );
  }, [groups, severity, deferredQuery]);
  const manual = useMemo(() => groupByRule(scan.manualReview), [scan.manualReview]);
  const advisory = useMemo(() => groupByRule(scan.advisory), [scan.advisory]);
  const repairsByViolation = useMemo(
    () => Object.fromEntries(repairs.repairs.map((r) => [r.violationId, r])),
    [repairs.repairs],
  );
  const marksById = useMemo(
    () => Object.fromEntries((scan.marks ?? []).map((mark) => [mark.violationId, mark])),
    [scan.marks],
  );
  const preview = useMemo(
    () => buildPreviewModel(scan.violations, scan.manualReview, scan.marks ?? []),
    [scan],
  );
  function selectOne(id) {
    setActiveId(id);
    setHighlightIds([id]);
  }
  function selectGroup(ids) {
    setActiveId(ids[0] ?? null);
    setHighlightIds(ids);
  }
  function showIssue(id) {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    document
      .getElementById('issues-pane')
      ?.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
    selectOne(id);
  }
  const issueProps = {
    marksById,
    numberById: preview.numberById,
    highlightIds,
    activeId,
    onSelect: selectOne,
    onSelectGroup: selectGroup,
    repairsByViolation,
    drafts: repairs.drafts,
    onDraft: repairs.setDraft,
    acceptedIds: repairs.acceptedIds,
    onAccept: repairs.accept,
    onReject: repairs.reject,
    onFix: repairs.propose,
    fixing: repairs.phase === 'proposing',
  };

  const crawled = scan.pages?.length > 0;
  const checkCount =
    (scan.score?.rules?.length ?? 0) + new Set(scan.manualReview.map((v) => v.ruleId)).size;
  const nav = [
    visualOn ? { id: 'preview', label: 'Preview' } : null,
    { id: 'issues-heading', label: 'Issues', count: groups.length },
    { id: 'manual-heading', label: 'Manual review', count: manual.length },
    { id: 'checks', label: 'Checks', count: checkCount },
    { id: 'colors', label: 'Colors' },
    { id: 'screen-reader', label: 'Screen reader' },
    { id: 'keyboard', label: 'Keyboard' },
    { id: 'code', label: 'Patched code' },
    crawled ? { id: 'pages', label: 'Pages', count: scan.pages.length } : null,
    { id: 'engine-log', label: 'Engine log' },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scan results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {scan.score?.standard ?? standardLabel(scanTarget(scan.options))} · screenshot inspector
            · verified patches only after a re-scan
          </p>
        </div>
        {onNewScan ? (
          <Button variant="outline" onClick={onNewScan}>
            New scan
          </Button>
        ) : (
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md border bg-surface px-4 text-sm font-medium no-underline hover:bg-raised"
          >
            New scan
          </Link>
        )}
      </div>

      <StickyScoreSummary scan={scan} verification={repairs.verification} repairs={repairs} />
      <ScoreCard
        scan={scan}
        verification={repairs.verification}
        headingRef={headingRef}
        repairs={repairs}
      />

      {scan.partial && (
        <Alert tone="info" role="status">
          This crawl stopped early. Finished pages kept their score. Apply works on those pages.
        </Alert>
      )}
      {scan.renderWarning && (
        <Alert tone="warning" icon={Info} role="note">
          {scan.renderWarning}
        </Alert>
      )}
      {scan.network?.blocked > 0 && (
        <Alert tone="info" icon={ShieldOff} role="note">
          <p>
            {plural(scan.network.blocked, 'resource')} on the page could not be loaded (blocked for
            safety, too large, or failed). Results reflect the page without{' '}
            {scan.network.blocked === 1 ? 'it' : 'them'}.
          </p>
          <ul className="mt-1 list-disc pl-5">
            {scan.network.blockedSamples.slice(0, 3).map((s) => (
              <li key={s.url} className="break-all">
                <code className="font-mono text-xs">{s.url}</code>: {s.reason}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {scan.page && !scan.page.settled && (
        <Alert tone="info" icon={Info} role="note">
          The page kept loading, so results reflect what had rendered when we checked.
        </Alert>
      )}

      <FixBar
        scan={scan}
        repairs={repairs}
        llmOff={health?.checks.llm === 'off'}
        llmPaused={llmPaused}
        useAi={useAi}
        onUseAi={setUseAi}
        proposing={repairs.phase === 'proposing'}
        applying={repairs.phase === 'applying'}
        onPropose={repairs.propose}
        onApply={repairs.apply}
      />

      <EfficiencyPanel usage={repairs.tokenUsage} />

      {repairs.error && <ErrorPanel error={repairs.error} onRetry={() => repairs.propose()} />}

      {repairs.verification && <VerificationPanel verification={repairs.verification} />}

      <div className="lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <SectionNav items={nav} />
        <div className="mt-6 min-w-0 space-y-6 lg:mt-0">
          <div className="xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] xl:items-start xl:gap-6">
            {visualOn && (
              <Workbench
                scan={{ ...scan, shots: freshShots ?? scan.shots }}
                highlightIds={highlightIds}
                onSelect={selectOne}
                filter={colorFilter}
                verification={repairs.verification}
                onRescan={onNewScan}
              />
            )}
            <div
              id="issues-pane"
              className="mt-6 min-w-0 rounded-xl border bg-surface p-5 xl:mt-0"
            >
              <IssueSections
                groups={groups}
                visible={visible}
                severity={severity}
                setSeverity={setSeverity}
                counts={counts}
                query={issueQuery}
                onQuery={setIssueQuery}
                manual={manual}
                advisory={advisory}
                scan={scan}
                issueProps={issueProps}
                manualChecked={manualChecked}
                toggleManual={toggleManual}
              />
            </div>
          </div>

          <SecondaryDisclosure title="What we checked">
            <section aria-label="Scan coverage" className="grid gap-3 text-sm sm:grid-cols-2">
              <p><span className="font-medium">Input:</span> {scan.input.type === 'url' ? 'URL loaded in a browser' : 'Pasted or uploaded HTML'}</p>
              <p><span className="font-medium">Viewport:</span> {scan.viewport?.width ?? 1280} × {scan.viewport?.height ?? 720} CSS pixels</p>
              <p><span className="font-medium">Color scheme:</span> Light</p>
              <p><span className="font-medium">Standard:</span> WCAG {scan.options?.target ?? 'AA'}</p>
              <p className="sm:col-span-2">Checks use rendered HTML, computed styles where the rule needs them, and JavaScript runs during page loading.</p>
              <p className="sm:col-span-2"><span className="font-medium">Not covered:</span> standalone CSS linting, other viewport sizes, dark mode, hover-only states, and application JavaScript logic.</p>
            </section>
          </SecondaryDisclosure>
          <SecondaryDisclosure title={`Checks (${checkCount})`}>
            <ChecksPanel scan={scan} onShowIssue={showIssue} />
          </SecondaryDisclosure>
          <SecondaryDisclosure title="Color and contrast">
            <ColorPanel scan={scan} onFilter={setColorFilter} visual={visualOn} />
          </SecondaryDisclosure>

          <SecondaryDisclosure title="Screen reader and keyboard">
            <section aria-labelledby="reader-heading">
              <h2 id="reader-heading" className="sr-only">
                Screen reader and keyboard details
              </h2>
              <div className="mt-2 grid gap-3 text-base leading-7 text-muted-foreground md:grid-cols-2">
                <p>
                  <span className="font-medium text-foreground">Screen reader.</span> For each
                  failing element we read the role and accessible name the browser computes, which
                  is what NVDA, JAWS or VoiceOver would announce. We do not run a real screen
                  reader, so reading order and live announcements still need a person.
                </p>
                <p>
                  <span className="font-medium text-foreground">Keyboard.</span> We press Tab in the
                  real page up to 50 times, record each stop, and flag controls Tab never reached
                  and focus with no visible outline. These are hints with a confidence level. They
                  do not change the score.
                </p>
              </div>
              <div className="mt-5 space-y-6">
                <ScreenReaderTable marks={scan.marks ?? []} numberById={preview.numberById} />
                <KeyboardPanel keyboard={scan.keyboard ?? []} focusOrder={scan.focusOrder ?? []} />
              </div>
            </section>
          </SecondaryDisclosure>

          <SecondaryDisclosure title="Patched code">
            <PatchedCode scanId={scan.id} verification={repairs.verification} visual={visualOn} />
          </SecondaryDisclosure>
          {crawled && (
            <SecondaryDisclosure title={`Pages crawled (${scan.pages.length})`}>
              <CrawlPages scan={scan} zipMaxBytes={health?.crawl?.zipMaxBytes} />
            </SecondaryDisclosure>
          )}
          <SecondaryDisclosure title="Engine log">
            <LogPanel key={scan.id} scanId={scan.id} saved={scan.events ?? []} />
          </SecondaryDisclosure>
        </div>
      </div>
    </div>
  );
}

function IssueSections({
  groups,
  visible,
  severity,
  setSeverity,
  counts,
  query,
  onQuery,
  manual,
  advisory,
  scan,
  issueProps,
  manualChecked,
  toggleManual,
}) {
  const done = manual.filter((g) => manualChecked.has(g.ruleId)).length;
  return (
    <>
      <Section
        id="issues-heading"
        title="Issues"
        description="Grouped by severity, then by rule. Open Details for the rule and the element."
      >
        {groups.length === 0 ? (
          <Alert tone="info" icon={CircleCheck} title="No automated WCAG issues found" role="note">
            That is a good start, not a guarantee. Review the manual checks and advisory notes
            below.
          </Alert>
        ) : (
          <>
            <SeverityFilter counts={counts} selected={severity} onChange={setSeverity} />
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-[12rem] flex-1 text-sm font-medium">
                Search issues
                <input
                  type="search"
                  value={query}
                  onChange={(event) => onQuery(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded-md border bg-background px-3 text-sm"
                  placeholder="Rule, title, or criterion"
                />
              </label>
              {(query || severity.length > 0) && (
                <button
                  type="button"
                  className="min-h-10 rounded-md border px-3 text-sm hover:bg-raised"
                  onClick={() => {
                    onQuery('');
                    setSeverity([]);
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              Showing {plural(visible.length, 'issue')} of {groups.length}.
            </p>
            {SEVERITIES.map((item) => {
              const list = visible.filter((group) => group.impact === item.value);
              if (list.length === 0) return null;
              return (
                <div key={item.value} className="mt-4">
                  <h3 className="text-sm font-semibold">
                    {item.label} ({list.length})
                  </h3>
                  <ul className="mt-2 space-y-3">
                    {list.map((group) => (
                      <li key={group.ruleId}>
                        <IssueGroup group={group} {...issueProps} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </>
        )}
      </Section>

      <Section
        id="manual-heading"
        title={`Needs manual review (${manual.length})`}
        description="Automated checks could not decide on these. A person needs to look at them. They never count as passed or failed. Tick each one once you have checked it; the ticks stay in this browser."
      >
        {manual.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing flagged for manual review.</p>
        ) : (
          <>
            <p className="mb-3 text-sm" role="status">
              <span className="tabular font-semibold">{done}</span> of {manual.length} checked by
              hand
            </p>
            <ul className="space-y-3">
              {manual.map((group) => (
                <li key={group.ruleId}>
                  <label className="mb-1.5 flex min-h-10 items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={manualChecked.has(group.ruleId)}
                      onChange={() => toggleManual(group.ruleId)}
                    />
                    I checked this by hand<span className="sr-only">: {group.items[0].title}</span>
                  </label>
                  <IssueGroup group={group} manual {...issueProps} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section
        id="advisory-heading"
        title={`Advisory (${advisory.length})`}
        description="Best practices that make pages easier to use. They are not WCAG failures."
      >
        <h3 className="text-sm font-semibold">Heading outline</h3>
        <div className="mt-2 rounded-lg border bg-background p-4">
          <HeadingOutline outline={scan.headingOutline} />
        </div>
        {advisory.length > 0 && (
          <ul className="mt-4 space-y-3">
            {advisory.map((group) => (
              <li key={group.ruleId}>
                <IssueGroup group={group} {...issueProps} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

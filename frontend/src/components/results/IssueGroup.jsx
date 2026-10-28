import { Copy, ExternalLink, Eye, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { oneLine } from '@/lib/markLayout.js';
import { severityOf } from '@/lib/severity.js';
import { RepairCard } from './RepairCard.jsx';

export function SeverityBadge({ impact, manual = false }) {
  if (manual) {
    return (
      <Badge className="border-border text-muted-foreground">
        <Eye aria-hidden="true" className="size-3.5" />
        Needs manual review
      </Badge>
    );
  }
  const s = severityOf(impact);
  return (
    <Badge className={s.className}>
      <s.Icon aria-hidden="true" className="size-3.5" />
      {s.label}
    </Badge>
  );
}

export function WcagChips({ refs }) {
  if (!refs.length) return null;
  return (
    <ul aria-label="WCAG success criteria" className="flex flex-wrap gap-1.5">
      {refs.map((r) => (
        <li key={r.sc}>
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-6 items-center gap-1 rounded-md border border-input px-2 text-xs hover:bg-surface"
          >
            {r.sc} {r.name}
            {r.level && ` · ${r.level}`}
            <ExternalLink aria-hidden="true" className="size-3" />
            <span className="sr-only">(opens W3C explanation in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * One rule with all of its affected elements.
 * @param {{ group: { ruleId: string, first: import('@/lib/api.js').Violation, impact: string,
 *   items: import('@/lib/api.js').Violation[] }, manual?: boolean,
 *   repairsByViolation?: Record<string, import('@/lib/api.js').Repair>,
 *   drafts?: Record<string, string>, onDraft?: (id: string, text: string) => void,
 *   acceptedIds?: Set<string>, onAccept?: (id: string) => void, onReject?: (id: string) => void,
 *   onFix?: (violationIds: string[]) => void, fixing?: boolean,
 *   marksById?: Record<string, { n: number | null, place: string }>,
 *   numberById?: Record<string, number>,
 *   highlightIds?: string[],
 *   activeId?: string | null, onSelect?: (id: string) => void,
 *   onSelectGroup?: (ids: string[]) => void }} props
 */
export function IssueGroup({
  group,
  manual = false,
  repairsByViolation = {},
  drafts = {},
  onDraft,
  acceptedIds = new Set(),
  onAccept,
  onReject,
  onFix,
  fixing = false,
  marksById = {},
  numberById = {},
  highlightIds = [],
  activeId = null,
  onSelect,
  onSelectGroup,
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const { first, items } = group;
  const n = items.length;
  const hasRepairs = items.some((v) => repairsByViolation[v.id]);
  const status = items.map((v) => repairsByViolation[v.id]?.status).find((s) => s === 'verified' || s === 'failed' || s === 'regressed');
  const highlighted = items.some((v) => highlightIds.includes(v.id) || v.id === activeId);
  const numbers = items.map((v) => numberById[v.id]).filter((n) => n != null);
  const elements = (
    <ul className="mt-2 space-y-2">
      {items.map((v) => {
        const mark = marksById[v.id];
        return (
          <li
            key={v.id}
            id={`issue-${v.id}`}
            tabIndex={-1}
            className={`rounded-md bg-surface p-3 ${highlightIds.includes(v.id) ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{numberById[v.id] != null ? `Mark ${numberById[v.id]}` : 'Page element'}</span>
              <code className="rounded bg-raised px-1.5 py-0.5">{v.node.html.match(/^<([\w-]+)/)?.[1] ?? 'element'}</code>
              <code className="min-w-0 flex-1 break-all text-muted-foreground">{v.node.target.join(' → ')}</code>
              {onSelect && numberById[v.id] != null && (
              <Button variant="outline" size="sm" aria-pressed={highlightIds.includes(v.id)} onClick={() => { setExpanded(true); onSelect(v.id); }}>Show on page</Button>
              )}
              <Button variant="ghost" size="sm" onClick={async () => {
                try { await navigator.clipboard.writeText(v.node.target.join(' ')); setCopiedId(v.id); }
                catch { setCopiedId(null); }
              }}><Copy aria-hidden="true" className="size-3.5" />{copiedId === v.id ? 'Copied' : 'Copy selector'}</Button>
            </div>
            {mark?.place === 'offscreen' && <p className="mt-1 text-xs text-muted-foreground">Outside the screenshot.</p>}
            {mark?.place === 'frame' && <p className="mt-1 text-xs text-muted-foreground">Inside another frame; no pin is available.</p>}
            {v.node.failureSummary && <p className="mt-2 text-sm text-muted-foreground">{v.node.failureSummary}</p>}
            <details className="mt-2">
              <summary className="min-h-9 cursor-pointer text-sm text-link">Element HTML</summary>
              <pre className="mt-1 overflow-x-auto rounded border bg-background p-2 font-mono text-xs"><code>{v.node.html}</code></pre>
            </details>
          </li>
        );
      })}
    </ul>
  );
  const repairs = (
    <ul className="mt-3 space-y-3">
      {items.map((v) => {
        const repair = repairsByViolation[v.id];
        if (!repair) return null;
        return (
          <li key={repair.id}>
            <RepairCard
              repair={repair}
              draft={drafts[repair.id] ?? ''}
              onDraft={(text) => onDraft?.(repair.id, text)}
              accepted={acceptedIds.has(repair.id) || repair.accepted}
              onAccept={() => onAccept?.(repair.id)}
              onReject={() => onReject?.(repair.id)}
            />
          </li>
        );
      })}
    </ul>
  );

  return (
    <article className={`rounded-lg border bg-background p-4 ${highlighted ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge impact={group.impact} manual={manual} />
        <span className="text-sm text-muted-foreground">{n} {n === 1 ? 'element' : 'elements'}</span>
        <Badge className={status === 'verified' ? 'border-verified text-verified' : status === 'failed' || status === 'regressed' ? 'border-critical text-critical' : 'border-border text-muted-foreground'}>{manual ? 'Needs review' : status === 'verified' ? 'Fixed (verified)' : status ? 'Not fixed (still failing)' : hasRepairs ? 'Fix available' : 'Needs review'}</Badge>
        {onFix && !manual && !hasRepairs && <Button variant="outline" size="sm" className="ml-auto" onClick={() => onFix(items.map((v) => v.id))} disabled={fixing}><Sparkles aria-hidden="true" className="size-3.5" />{fixing ? 'Finding fixes…' : 'Suggest fix'}</Button>}
      </div>
      <h3 id={`issue-title-${first.id}`} className="mt-2 max-w-[65ch] text-base font-semibold leading-6">{first.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {numbers.length > 0 && <span className="text-muted-foreground">{numbers.length === 1 ? `Mark ${numbers[0]}` : `Marks ${numbers.join(', ')}`}</span>}
        {onSelect && numbers.length > 0 && <Button variant="outline" size="sm" onClick={() => { setExpanded(true); onSelectGroup ? onSelectGroup(items.map((item) => item.id)) : onSelect(items[0].id); }}>Show on page</Button>}
      </div>
      <details className="mt-3" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary className="min-h-10 cursor-pointer text-sm font-medium text-link">Issue details and affected elements</summary>
        <div className="mt-2 space-y-3">
          <p className="text-sm leading-6"><span className="text-xs text-muted-foreground">What is broken</span><br />{oneLine(first.title)}</p>
          <p className="text-sm leading-6"><span className="text-xs text-muted-foreground">Who it affects</span><br />{oneLine(first.whoItAffects)}</p>
          <p className="text-sm leading-6"><span className="text-xs text-muted-foreground">Why it matters</span><br />{oneLine(first.explanation) || first.title}</p>
          <div className="text-sm leading-6"><span className="text-xs text-muted-foreground">How we fix it</span><br /><Badge className="mr-2 border-border text-muted-foreground">{manual ? 'Manual' : items.some((v) => repairsByViolation[v.id]?.strategy === 'llm') ? 'Draft to review' : hasRepairs ? 'Automatic' : 'Manual'}</Badge>{manual ? 'A person needs to review this.' : hasRepairs ? 'Review the proposed patch below before applying it.' : 'Suggest fixes to see whether a safe automatic patch is available.'}</div>
          {hasRepairs && repairs}
          {first.source === 'axe' && <p className="text-xs text-muted-foreground">Detected by axe-core ({first.ruleId})</p>}
          {first.helpUrl && <a href={first.helpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-link underline">Rule reference: {first.ruleId}<ExternalLink aria-hidden="true" className="size-3" /></a>}
          <div><h4 className="text-sm font-medium">Affected elements</h4>{elements}</div>
          <details className="rounded border p-3">
            <summary className="min-h-9 cursor-pointer text-sm font-medium">Technical details</summary>
            <div className="mt-2 space-y-3"><p className="text-sm">Rule ID: <code>{first.ruleId}</code></p><WcagChips refs={first.wcag.refs} />
              <p className="text-sm text-muted-foreground">Verification: AccessFix reruns the automated checks after applying a fix; manual items require a person to confirm.</p>
            </div>
          </details>
        </div>
      </details>
    </article>
  );
}

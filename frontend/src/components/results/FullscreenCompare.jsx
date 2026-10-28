import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog.jsx';
import { screenshotUrl } from '@/lib/api.js';
import { buildPreviewModel, MARK_GLYPH, oneLine } from '@/lib/markLayout.js';
import { SEVERITIES, severityOf } from '@/lib/severity.js';
import { Marks } from './Marks.jsx';

const MODES = [
  ['slider', 'Slider'],
  ['side', 'Side by side'],
  ['before', 'Before only'],
  ['after', 'After only'],
];
const MODE_KEY = 'accessfix.compare-mode';
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2.5;

function savedMode() {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return MODES.some(([mode]) => mode === value) ? value : 'slider';
  } catch {
    return 'slider';
  }
}

function stateLabel(item, verification) {
  if (!verification) return item.manual ? 'Needs review' : 'Fix available';
  const id = item.violation.id;
  if (verification.resolved.some((entry) => entry.id === id)) return 'Resolved';
  if (verification.regressions.some((entry) => entry.id === id)) return 'Regression';
  if (verification.remaining.some((entry) => entry.id === id)) return 'Remaining';
  return item.manual ? 'Needs review' : 'Fix available';
}

function IssuePanel({ items, selectedId, onSelect, onMove, verification, filter, onFilter }) {
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.violation.id === selectedId),
  );
  return (
    <aside
      className="flex min-h-0 flex-col border-t bg-surface xl:border-l xl:border-t-0"
      aria-label="Preview issues"
    >
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          Filter
          <select
            value={filter}
            onChange={(event) => onFilter(event.target.value)}
            className="min-h-9 min-w-0 flex-1 rounded-md border bg-background px-2"
            aria-label="Filter preview issues by severity"
          >
            <option value="all">All severities</option>
            <option value="remaining">Remaining</option>
            <option value="fixed">Fixed</option>
            <option value="review">Needs review</option>
            {SEVERITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
            <option value="manual">Needs manual review</option>
          </select>
        </label>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md border"
            aria-label="Previous issue"
            onClick={() => onMove(-1)}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md border"
            aria-label="Next issue"
            onClick={() => onMove(1)}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      <p className="px-4 pt-3 text-sm text-muted-foreground" aria-live="polite">
        {items.length
          ? `Issue ${selectedIndex + 1} of ${items.length}`
          : 'No issues match this filter'}
      </p>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {items.map((item) => {
          const violation = item.violation;
          const status = stateLabel(item, verification);
          const severity = item.manual ? 'Needs manual review' : severityOf(violation.impact).label;
          return (
            <li key={violation.id} id={`compare-issue-${violation.id}`}>
              <button
                type="button"
                aria-current={selectedId === violation.id ? 'true' : undefined}
                onClick={() => onSelect(violation.id)}
                className={`w-full rounded-lg border p-3 text-left ${selectedId === violation.id ? 'border-primary bg-background ring-1 ring-primary' : 'bg-background hover:bg-raised'}`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={
                        item.manual
                          ? 'text-moderate'
                          : severityOf(violation.impact).className.split(' ')[0]
                      }
                    >
                      {item.manual ? MARK_GLYPH.manual : MARK_GLYPH[violation.impact]}
                    </span>
                    {severity}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {status === 'Resolved' && <Check aria-hidden="true" className="size-3.5" />}
                    {status}
                  </span>
                </span>
                <span className="mt-1 block text-sm leading-5">
                  {oneLine(violation.title || violation.explanation)}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {violation.node?.target?.join(' → ') || 'Page-level issue'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function VerificationSummary({ items, className }) {
  const counts = items.reduce(
    (result, item) => {
      if (item.verifiedStatus === 'Resolved') result.resolved += 1;
      if (item.verifiedStatus === 'Remaining') result.remaining += 1;
      if (item.verifiedStatus === 'Regression') result.regressions += 1;
      return result;
    },
    { resolved: 0, remaining: 0, regressions: 0 },
  );
  if (!counts.resolved && !counts.remaining && !counts.regressions) return null;
  return (
    <div className={className} aria-label="Verification status on the after screenshot">
      {counts.resolved > 0 && (
        <span className="inline-flex items-center gap-1 rounded border border-verified bg-background/95 px-2 py-1 text-verified">
          <CircleCheck aria-hidden="true" className="size-3.5" /> {counts.resolved} resolved
        </span>
      )}
      {counts.remaining > 0 && (
        <span className="rounded border border-critical bg-background/95 px-2 py-1 text-critical">
          {counts.remaining} remaining
        </span>
      )}
      {counts.regressions > 0 && (
        <span className="rounded border border-critical bg-background/95 px-2 py-1 text-critical">
          {counts.regressions} regressions
        </span>
      )}
    </div>
  );
}

function ScreenshotFrame({
  after,
  className = '',
  src,
  items,
  selectedId,
  markItems,
  showMarks,
  onSelect,
  onBroken,
  style,
  filter,
}) {
  return (
    <figure className={`min-w-0 ${className}`}>
      <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold">
        <span>{after ? 'After' : 'Before'}</span>
        {after && verificationTag(items, selectedId) ? (
          <span className="text-xs font-normal text-muted-foreground">
            {verificationTag(items, selectedId)}
          </span>
        ) : null}
      </figcaption>
      <div className="relative aspect-video overflow-hidden bg-surface" style={style}>
        <img
          src={src}
          alt={after ? 'Page after verified fixes' : 'Page before fixes'}
          className="absolute inset-0 size-full object-contain"
          style={filter ? { filter } : undefined}
          onError={() => onBroken(after ? 'after' : 'before')}
        />
        {after && (
          <VerificationSummary
            items={items}
            className="absolute left-2 top-2 z-10 flex flex-wrap gap-1.5 text-xs font-semibold sm:left-3 sm:top-3"
          />
        )}
        {!after && showMarks && (
          <Marks
            items={markItems}
            highlightIds={selectedId ? [selectedId] : []}
            onSelect={onSelect}
          />
        )}
      </div>
    </figure>
  );
}

function CompareFrame({
  mode,
  beforeSrc,
  afterSrc,
  items,
  markItems,
  selectedId,
  showMarks,
  split,
  setSplit,
  onSelect,
  width,
  onBroken,
  filter,
}) {
  const frameStyle = { width, height: (width * 9) / 16 };
  const afterOnly = mode === 'after';

  if (mode === 'side') {
    return (
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <div className="overflow-hidden rounded-lg border bg-background">
          <ScreenshotFrame
            after={false}
            src={beforeSrc}
            items={items}
            selectedId={selectedId}
            markItems={markItems}
            showMarks={showMarks}
            onSelect={onSelect}
            onBroken={onBroken}
            filter={filter}
            style={{ width: '100%' }}
          />
        </div>
        <div className="overflow-hidden rounded-lg border bg-background">
          <ScreenshotFrame
            after
            src={afterSrc}
            items={items}
            selectedId={selectedId}
            markItems={markItems}
            showMarks={showMarks}
            onSelect={onSelect}
            onBroken={onBroken}
            filter={filter}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  }
  if (mode === 'slider') {
    return (
      <div className="relative overflow-hidden rounded-lg border bg-background" style={frameStyle}>
        <img
          src={beforeSrc}
          alt="Page before fixes"
          className="absolute inset-0 size-full object-contain"
          style={filter ? { filter } : undefined}
          onError={() => onBroken('before')}
        />
        <img
          src={afterSrc}
          alt="Page after verified fixes"
          className="absolute inset-0 size-full object-contain"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)`, ...(filter ? { filter } : {}) }}
          onError={() => onBroken('after')}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between p-3 text-sm font-semibold text-white [text-shadow:0_1px_4px_#000]">
          <span className="rounded bg-black/60 px-2 py-1">Before</span>
          <span className="rounded bg-black/60 px-2 py-1">After</span>
        </div>
        <VerificationSummary
          items={items}
          className="pointer-events-none absolute left-3 top-12 z-10 flex flex-wrap gap-1.5 text-xs font-semibold"
        />
        {showMarks && (
          <Marks
            items={markItems}
            highlightIds={selectedId ? [selectedId] : []}
            onSelect={onSelect}
          />
        )}
        <div className="pointer-events-none absolute inset-y-0 z-20" style={{ left: `${split}%` }}>
          <div className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_#0f172a]" />
          <div className="absolute left-0 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-[0_0_0_2px_#0f172a]">
            <span aria-hidden="true">↔</span>
          </div>
        </div>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Before and after comparison"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={split}
          aria-valuetext={`${split}% showing after`}
          className="absolute inset-0 z-[5] cursor-ew-resize touch-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-primary"
          onPointerDown={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            setSplit(
              Math.round(
                Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
              ),
            );
            try {
              event.currentTarget.setPointerCapture?.(event.pointerId);
            } catch {
              /* Synthetic pointer events used in tests cannot capture a pointer. */
            }
          }}
          onPointerMove={(event) => {
            if (event.buttons === 0) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            setSplit(
              Math.round(
                Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
              ),
            );
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 10 : 1;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault();
              setSplit((value) => Math.max(0, value - step));
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault();
              setSplit((value) => Math.min(100, value + step));
            }
            if (event.key === 'Home') {
              event.preventDefault();
              setSplit(0);
            }
            if (event.key === 'End') {
              event.preventDefault();
              setSplit(100);
            }
          }}
        />
        <span className="sr-only" aria-live="polite">
          Showing {split}% of the after image.
        </span>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <ScreenshotFrame
        after={afterOnly}
        src={afterOnly ? afterSrc : beforeSrc}
        items={items}
        selectedId={selectedId}
        markItems={markItems}
        showMarks={showMarks}
        onSelect={onSelect}
        onBroken={onBroken}
        filter={filter}
        style={frameStyle}
      />
    </div>
  );
}

function verificationTag(items, selectedId) {
  const item = items.find((entry) => entry.violation.id === selectedId);
  return item?.verifiedStatus;
}

/** Full-viewport screenshot comparison, layered on the existing captured shots. */
export function FullscreenCompare({ scan, verification, onRescan, onSelectIssue, colorFilter }) {
  const storedMode = savedMode();
  const hasAfterOnScan = Boolean(scan.shots?.after);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(() => storedMode ?? (hasAfterOnScan ? 'slider' : 'before'));
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [showMarks, setShowMarks] = useState(true);
  const [filter, setFilter] = useState('all');
  const [broken, setBroken] = useState({ before: false, after: false });
  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const modeChosen = useRef(Boolean(storedMode));
  const stageRef = useRef(null);
  const scrollStart = useRef(null);
  const pointers = useRef(new Map());
  const pinchStart = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 1280, height: 720 });
  const beforeSrc = screenshotUrl(scan.id, 'before');
  const afterSrc = screenshotUrl(scan.id, 'after');
  const hasBefore = Boolean(scan.shots?.before) && !broken.before;
  const hasAfter = Boolean(scan.shots?.after) && !broken.after;
  const model = useMemo(
    () => buildPreviewModel(scan.violations ?? [], scan.manualReview ?? [], scan.marks ?? []),
    [scan],
  );
  const source = [...model.boxes, ...model.chips];
  const filtered = source.filter(
    (item) =>
      filter === 'all' ||
      (filter === 'manual' || filter === 'review'
        ? item.manual
        : filter === 'fixed'
          ? stateLabel(item, verification) === 'Resolved'
          : filter === 'remaining'
            ? ['Remaining', 'Regression'].includes(stateLabel(item, verification))
            : !item.manual && item.violation.impact === filter),
  );
  const markItems = filtered
    .filter((item) => item.mark?.place === 'pin' && item.mark.x != null)
    .map((item) => ({ ...item, verifiedStatus: stateLabel(item, verification) }));
  const items = filtered.map((item) => ({
    ...item,
    verifiedStatus: stateLabel(item, verification),
  }));
  const effectiveId = items.some((item) => item.violation.id === selectedId)
    ? selectedId
    : (items[0]?.violation.id ?? null);
  const availableWidth = mode === 'side' ? (stageSize.width - 12) / 2 : stageSize.width;
  const naturalWidth = Math.max(160, Math.min(1280, availableWidth, (stageSize.height * 16) / 9));
  const frameWidth = naturalWidth * zoom;
  const close = useCallback(() => setOpen(false), []);
  const selectIssue = useCallback((id) => {
    setSelectedId(id);
    onSelectIssue?.(id);
    const item = items.find((entry) => entry.violation.id === id);
    if (item?.mark?.x != null && stageRef.current) {
      stageRef.current.scrollLeft = Math.max(0, item.mark.x * frameWidth - stageSize.width / 2);
      stageRef.current.scrollTop = Math.max(
        0,
        (item.mark.y * frameWidth * 9) / 16 - stageSize.height / 2,
      );
    }
  }, [frameWidth, items, onSelectIssue, stageSize.height, stageSize.width]);
  const moveSelected = useCallback((direction) => {
    if (!items.length) return;
    const current = Math.max(0, items.findIndex((item) => item.violation.id === effectiveId));
    const next = (current + direction + items.length) % items.length;
    const id = items[next].violation.id;
    selectIssue(id);
    document.getElementById(`compare-issue-${id}`)?.scrollIntoView({ block: 'nearest' });
  }, [effectiveId, items, selectIssue]);

  useEffect(() => {
    if (hasAfter && !modeChosen.current) setMode('slider');
  }, [hasAfter]);

  useEffect(() => {
    if (!open) return undefined;
    const node = stageRef.current;
    if (!node || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setStageSize({ width: rect.width, height: rect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, drawerOpen]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.matches('input,select,textarea,[role="slider"]')
      )
        return;
      if (event.key === '?') setShowShortcuts((value) => !value);
      if (event.key.toLowerCase() === 'm') setShowMarks((value) => !value);
      if (event.key === '[') moveSelected(-1);
      if (event.key === ']') moveSelected(1);
      if (event.key === '0') setZoom(1);
      if (['1', '2', '3', '4'].includes(event.key)) {
        const nextMode = MODES[Number(event.key) - 1]?.[0];
        if (nextMode && (nextMode === 'before' || hasAfter)) chooseMode(nextMode);
      }
      if (event.key === '+' || event.key === '=')
        setZoom((value) => Math.min(MAX_ZOOM, Math.round((value + 0.25) * 100) / 100));
      if (event.key === '-' || event.key === '_')
        setZoom((value) => Math.max(MIN_ZOOM, Math.round((value - 0.25) * 100) / 100));
      const offsets = {
        ArrowLeft: [-48, 0],
        ArrowRight: [48, 0],
        ArrowUp: [0, -48],
        ArrowDown: [0, 48],
      };
      if (zoom > 1 && offsets[event.key]) {
        event.preventDefault();
        stageRef.current?.scrollBy(...offsets[event.key]);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, zoom, hasAfter, moveSelected]);

  function chooseMode(value) {
    modeChosen.current = true;
    setMode(value);
    try {
      localStorage.setItem(MODE_KEY, value);
    } catch {
      /* storage may be disabled */
    }
  }
  function pointerStart(event) {
    if (event.target.closest('button')) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      scrollStart.current = null;
      stageRef.current.setPointerCapture?.(event.pointerId);
      return;
    }
    if (zoom <= 1) return;
    scrollStart.current = {
      x: event.clientX,
      y: event.clientY,
      left: stageRef.current.scrollLeft,
      top: stageRef.current.scrollTop,
    };
    stageRef.current.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event) {
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStart.current.zoom * distance / pinchStart.current.distance)));
      return;
    }
    if (!scrollStart.current) return;
    stageRef.current.scrollLeft =
      scrollStart.current.left - (event.clientX - scrollStart.current.x);
    stageRef.current.scrollTop = scrollStart.current.top - (event.clientY - scrollStart.current.y);
  }
  function pointerEnd(event) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    scrollStart.current = null;
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-raised"
        onClick={() => setOpen(true)}
      >
        <Maximize2 aria-hidden="true" className="size-4" /> Full screen
      </button>
      <Dialog
        open={open}
        onClose={close}
        labelledBy="fullscreen-compare-title"
        fullScreen
        className="grid grid-rows-[auto_minmax(0,1fr)_auto]"
      >
        <header className="flex min-h-14 flex-wrap items-center gap-2 border-b bg-surface px-3 py-2 sm:px-4">
          <h2 id="fullscreen-compare-title" className="mr-auto text-base font-semibold">
            Full-screen comparison
          </h2>
          <div
            role="group"
            aria-label="Comparison mode"
            className="flex max-w-full overflow-x-auto rounded-md border bg-background p-0.5"
          >
            {MODES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                disabled={
                  (value === 'slider' || value === 'side' || value === 'after') && !hasAfter
                }
                onClick={() => chooseMode(value)}
                className={`min-h-9 shrink-0 rounded px-2.5 text-sm disabled:opacity-50 sm:px-3 ${mode === value ? 'bg-raised font-semibold' : 'text-muted-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Close full-screen comparison"
            className="inline-flex size-10 items-center justify-center rounded-md border hover:bg-raised"
            onClick={close}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>
        <div className="grid min-h-0 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <main className="relative flex min-h-0 min-w-0 flex-col">
            <p className="flex shrink-0 items-center justify-center gap-2 px-2 py-1.5 text-xs text-muted-foreground sm:text-sm">
              Viewport screenshot · {scan.viewport?.width ?? 1280} × {scan.viewport?.height ?? 720}{' '}
              · full-page capture is future work
            </p>
            {!hasBefore ? (
              <div className="m-auto max-w-md p-6 text-center">
                <h3 className="text-lg font-semibold">
                  {broken.before ? 'Screenshot expired' : 'No screenshot was captured'}
                </h3>
                <p className="mt-2 text-base text-muted-foreground">
                  {broken.before
                    ? 'Rescan to refresh the preview. The issue list and repair controls still work.'
                    : 'The scan results and repair controls still work without a screenshot.'}
                </p>
                {onRescan && (
                  <button
                    type="button"
                    className="mt-4 min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                    onClick={onRescan}
                  >
                    Rescan to refresh
                  </button>
                )}
              </div>
            ) : (
              <div
                ref={stageRef}
                tabIndex={zoom > 1 ? 0 : -1}
                aria-label="Screenshot canvas. When zoomed, use arrow keys or drag to pan."
                className={`relative min-h-0 flex-1 overflow-auto bg-background p-3 sm:p-4 ${zoom > 1 ? 'cursor-grab focus-visible:cursor-grab' : ''}`}
                onPointerDown={pointerStart}
                onPointerMove={pointerMove}
                onPointerUp={pointerEnd}
                onPointerCancel={pointerEnd}
                onWheel={(event) => {
                  event.preventDefault();
                  const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom - Math.sign(event.deltaY) * 0.1));
                  const rect = stageRef.current.getBoundingClientRect();
                  const anchorX = event.clientX - rect.left + stageRef.current.scrollLeft;
                  const anchorY = event.clientY - rect.top + stageRef.current.scrollTop;
                  setZoom(nextZoom);
                  requestAnimationFrame(() => {
                    if (!stageRef.current) return;
                    const ratio = nextZoom / zoom;
                    stageRef.current.scrollLeft = anchorX * ratio - (event.clientX - rect.left);
                    stageRef.current.scrollTop = anchorY * ratio - (event.clientY - rect.top);
                  });
                }}
              >
                {!hasAfter && mode === 'before' && (
                  <p className="mb-3 rounded-md border border-moderate px-3 py-2 text-sm text-moderate">
                    Before image only. Apply verified fixes to create an after screenshot;
                    comparison modes are disabled until then.
                  </p>
                )}
                <div
                  className={`mx-auto flex ${mode === 'side' && hasAfter ? 'min-w-max items-start gap-3' : 'justify-center'}`}
                  style={
                    mode === 'side' && hasAfter
                      ? { width: frameWidth * 2 + 12 }
                      : { width: frameWidth }
                  }
                >
                  {!hasAfter && (mode === 'slider' || mode === 'side' || mode === 'after') ? (
                    mode === 'after' ? (
                      <div className="grid min-h-48 w-full place-items-center rounded-lg border bg-surface p-5 text-center text-base text-muted-foreground">
                        {broken.after
                          ? 'The after screenshot expired. Switch to Before only or rescan to create a fresh comparison.'
                          : 'Apply verified fixes to create an after screenshot.'}
                      </div>
                    ) : (
                      <div className="w-full">
                        {mode !== 'before' && (
                          <p className="mb-2 rounded-md border border-moderate px-3 py-2 text-sm text-moderate">
                            Apply verified fixes to create an after screenshot. Showing the before
                            image until then.
                          </p>
                        )}
                        <CompareFrame
                          mode="before"
                          beforeSrc={beforeSrc}
                          afterSrc={afterSrc}
                          items={items}
                          markItems={markItems}
                          selectedId={effectiveId}
                          showMarks={showMarks}
                          split={split}
                          setSplit={setSplit}
                          onSelect={selectIssue}
                          width={frameWidth}
                          onBroken={(key) => setBroken((value) => ({ ...value, [key]: true }))}
                          filter={colorFilter}
                        />
                      </div>
                    )
                  ) : (
                    <CompareFrame
                      mode={mode}
                      beforeSrc={beforeSrc}
                      afterSrc={afterSrc}
                      items={items}
                      markItems={markItems}
                      selectedId={effectiveId}
                      showMarks={showMarks}
                      split={split}
                      setSplit={setSplit}
                      onSelect={selectIssue}
                      width={frameWidth}
                      onBroken={(key) => setBroken((value) => ({ ...value, [key]: true }))}
                      filter={colorFilter}
                    />
                  )}
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-background/95 p-1.5 shadow-popover sm:bottom-4">
              <button
                type="button"
                aria-label="Zoom out"
                className="inline-flex size-10 items-center justify-center rounded-md hover:bg-raised"
                onClick={() =>
                  setZoom((value) => Math.max(MIN_ZOOM, Math.round((value - 0.25) * 100) / 100))
                }
              >
                <Minus aria-hidden="true" className="size-4" />
              </button>
              <span className="min-w-14 text-center text-sm tabular-nums" aria-live="polite">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                className="inline-flex size-10 items-center justify-center rounded-md hover:bg-raised"
                onClick={() =>
                  setZoom((value) => Math.min(MAX_ZOOM, Math.round((value + 0.25) * 100) / 100))
                }
              >
                <Plus aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm hover:bg-raised"
                onClick={() => setZoom(1)}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Fit</span>
              </button>
              <button type="button" className="hidden min-h-10 rounded-md px-2 text-sm hover:bg-raised sm:inline-flex" onClick={() => setZoom(1)}>100%</button>
              <button type="button" className="hidden min-h-10 rounded-md px-2 text-sm hover:bg-raised sm:inline-flex" onClick={() => setZoom(MAX_ZOOM)}>Fill</button>
              <span className="mx-1 h-6 border-l" />
              <button
                type="button"
                aria-pressed={showMarks}
                className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm hover:bg-raised"
                onClick={() => setShowMarks((value) => !value)}
              >
                {showMarks ? (
                  <Minimize2 aria-hidden="true" className="size-4" />
                ) : (
                  <Maximize2 aria-hidden="true" className="size-4" />
                )}
                <span className="hidden sm:inline">Marks</span>
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm hover:bg-raised xl:hidden"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen((value) => !value)}
              >
                <ArrowUp aria-hidden="true" className="size-4" /> Issues
              </button>
            </div>
          </main>
          <div
            className={`${drawerOpen ? 'absolute inset-x-0 bottom-0 z-10 h-[45dvh] border-t shadow-popover' : 'hidden'} h-full xl:relative xl:block xl:border-l xl:border-t-0 xl:shadow-none`}
          >
            <IssuePanel
              items={items}
              selectedId={effectiveId}
              onSelect={selectIssue}
              onMove={moveSelected}
              verification={verification}
              filter={filter}
              onFilter={setFilter}
            />
          </div>
          {showShortcuts && <div role="dialog" aria-label="Keyboard shortcuts" className="absolute bottom-20 left-1/2 z-30 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border bg-background p-4 text-sm shadow-popover"><div className="flex items-center justify-between"><h3 className="font-semibold">Keyboard shortcuts</h3><button type="button" aria-label="Close shortcuts" onClick={() => setShowShortcuts(false)}>×</button></div><p className="mt-2">+ / − zoom · 0 fit · arrows pan · [ / ] previous or next issue · M marks · 1–4 comparison modes · ? this list</p></div>}
        </div>
        <footer className="flex min-h-12 items-center justify-between gap-3 border-t bg-surface px-4 py-2 text-xs text-muted-foreground sm:text-sm">
          <span>Comparison uses the original 1280 × 720 viewport screenshot, scaled to fit.</span>
          <span className="hidden sm:inline">Use + / − to zoom; arrows pan when zoomed.</span>
        </footer>
      </Dialog>
    </>
  );
}

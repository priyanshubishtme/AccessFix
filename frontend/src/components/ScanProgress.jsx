import { useEffect, useState } from 'react';
import { CircleCheck, Circle, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const STEPS = [
  { stage: 'queued', label: 'Waiting for a free scanner' },
  { stage: 'loading', label: 'Loading the page' },
  { stage: 'rendering', label: 'Letting it finish rendering' },
  { stage: 'checking', label: 'Running accessibility checks' },
  { stage: 'normalizing', label: 'Writing up the results' },
];

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} m ${s} s`;
}

/** @param {{ stage: import('@/lib/api.js').Stage | 'submitting', onCancel: () => void }} props */
export function ScanProgress({ stage, onCancel }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  const current =
    stage === 'submitting'
      ? 0
      : Math.max(
          0,
          STEPS.findIndex((s) => s.stage === stage),
        );
  const label = STEPS[current]?.label ?? 'Scanning';
  const known = STEPS.some((s) => s.stage === stage) || stage === 'submitting';

  return (
    <section aria-labelledby="progress-heading" className="rounded-lg border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="progress-heading" className="text-lg font-semibold">
          Scanning
        </h2>
        <p className="tabular text-sm text-muted-foreground" aria-live="polite">
          Elapsed {formatElapsed(elapsed)}
        </p>
      </div>
      <p role="status" className="sr-only">
        {label}
      </p>
      {!known && (
        <p className="mt-2 text-sm" role="status">
          {stage}
        </p>
      )}
      <ol className="mt-3 space-y-2">
        {STEPS.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'pending';
          const Icon = state === 'done' ? CircleCheck : state === 'current' ? LoaderCircle : Circle;
          return (
            <li
              key={s.stage}
              aria-current={state === 'current' ? 'step' : undefined}
              className={`flex items-center gap-2 text-base ${state === 'pending' ? 'text-muted-foreground' : ''}`}
            >
              <Icon
                aria-hidden="true"
                className={`size-4 ${state === 'done' ? 'text-verified' : ''} ${state === 'current' ? 'animate-spin text-link' : ''}`}
              />
              <span>{s.label}</span>
              <span className="sr-only">
                {state === 'done' ? '(done)' : state === 'current' ? '(in progress)' : '(waiting)'}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        Stage is whatever the scanner last reported. Remaining time is not estimated.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onCancel}>
        Cancel
      </Button>
    </section>
  );
}

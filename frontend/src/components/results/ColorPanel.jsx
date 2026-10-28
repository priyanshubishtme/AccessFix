import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { colorPairs } from '@/lib/colorFix.js';
import { scanTarget } from '@/lib/target.js';
import { Simulators } from './Simulators.jsx';

function Swatch({ fg, bg, label }) {
  return (
    <span
      className="inline-flex h-10 w-16 items-center justify-center rounded-md border text-base font-semibold"
      style={{ color: fg, background: bg }}
      role="img"
      aria-label={label}
    >
      Aa
    </span>
  );
}

function CopyButton({ value }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md border bg-background px-2.5 text-sm hover:bg-raised"
      onClick={() =>
        navigator.clipboard?.writeText(value).then(
          () => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1500);
          },
          () => {},
        )
      }
    >
      {done ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
      {done ? 'Copied' : 'Copy'}
      <span className="sr-only"> {value}</span>
    </button>
  );
}

/**
 * Failing color pairs from the scan, a nearest passing text color for each,
 * and the approximate color-vision filters for the screenshot.
 * @param {{ scan: import('@/lib/api.js').Scan, onFilter: (f: string | null) => void, visual: boolean }} props
 */
export function ColorPanel({ scan, onFilter, visual }) {
  const pairs = colorPairs(scan.violations);
  const target = scanTarget(scan.options);
  return (
    <section id="colors" aria-labelledby="colors-heading" className="rounded-xl border bg-surface p-5 sm:p-6">
      <h2 id="colors-heading" className="text-lg font-semibold">
        Colors
      </h2>
      <p className="mt-1 max-w-[70ch] text-sm leading-6 text-muted-foreground">
        WCAG 1.4.3 (AA) needs 4.5:1 for normal text, or 3:1 when it is large or bold.
        {target === 'AAA'
          ? ' AAA enhanced contrast (7:1) appears only when axe-core ran color-contrast-enhanced for this scan.'
          : ' AAA 7:1 was not part of this scan.'}{' '}
        Each row is a failing pair the scanner measured. A passing suggestion is not a complete accessible palette.
        Suggest fixes creates the real patch, which you review before it is applied.
      </p>
      {pairs.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          No failing text and background pair was measured on this page.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-sm">
            <caption className="sr-only">Failing color pairs and suggested replacements</caption>
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Now
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Ratio
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Suggested text color
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  New ratio
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Elements
                </th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.key} className="border-b last:border-b-0">
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-3">
                      <Swatch fg={p.fg} bg={p.bg} label={`${p.fg} text on ${p.bg}`} />
                      <span className="font-mono text-xs leading-5">
                        {p.fg}
                        <br />
                        on {p.bg}
                      </span>
                    </span>
                  </td>
                  <td className="tabular py-3 pr-3 text-right">
                    <span className="font-semibold text-critical">{p.ratio.toFixed(2)}:1</span>
                    <span className="block text-xs text-muted-foreground">needs {p.min}:1</span>
                  </td>
                  <td className="py-3 pr-3">
                    {p.suggestion ? (
                      <span className="flex flex-wrap items-center gap-3">
                        <Swatch fg={p.suggestion.color} bg={p.bg} label={`${p.suggestion.color} text on ${p.bg}`} />
                        <span className="font-mono text-xs">{p.suggestion.color}</span>
                        <CopyButton value={p.suggestion.color} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Change the background instead.</span>
                    )}
                  </td>
                  <td className="tabular py-3 pr-3 text-right">
                    {p.suggestion ? <span className="font-semibold text-verified">{p.suggestion.ratio.toFixed(2)}:1</span> : '—'}
                  </td>
                  <td className="tabular py-3 text-right">{p.ids.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {visual && (
        <div className="mt-6 border-t pt-5">
          <Simulators onFilter={onFilter} />
        </div>
      )}
    </section>
  );
}

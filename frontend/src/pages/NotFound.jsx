import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from '@/lib/Link.jsx';

export function NotFound({ path }) {
  return (
    <section
      className="mx-auto max-w-2xl rounded-2xl border bg-surface p-6 sm:p-10"
      aria-labelledby="not-found-heading"
    >
      <SearchX aria-hidden="true" className="size-8 text-link" />
      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-link">
        Page not found
      </p>
      <h1 id="not-found-heading" className="mt-2 text-3xl font-semibold tracking-tight">
        That address does not lead to a page.
      </h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        {path ? (
          <>
            <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-sm">{path}</code> is not
            an AccessFix route.
          </>
        ) : (
          'The route you requested is unavailable.'
        )}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground no-underline hover:brightness-110"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to scan
      </Link>
    </section>
  );
}

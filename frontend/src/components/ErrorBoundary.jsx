import { Component } from 'react';
import { ServerCrash } from 'lucide-react';
import { Link } from '@/lib/Link.jsx';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main id="main" className="grid min-h-[65vh] place-items-center px-4 py-10">
          <section
            className="w-full max-w-xl rounded-2xl border border-critical/40 bg-surface p-6 sm:p-8"
            role="alert"
          >
            <ServerCrash aria-hidden="true" className="size-8 text-critical" />
            <h1 className="mt-4 text-2xl font-semibold">This page could not load.</h1>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              Refresh and try again. If the problem continues, return to scanning or use the report
              link you already have.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground no-underline"
            >
              Back to scan
            </Link>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

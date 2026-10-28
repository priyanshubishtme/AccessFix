import { useEffect, useState } from 'react';
import { LogOut, Menu, ShieldAlert, X } from 'lucide-react';
import { ApiStatus } from '@/components/ApiStatus.jsx';
import { getMe, logout } from '@/lib/api.js';
import { Link } from '@/lib/Link.jsx';
import { navigate } from '@/lib/path.js';
import { saveTheme } from '@/lib/theme.js';

const NAV = [
  { href: '/', label: 'Scan' },
  { href: '/projects', label: 'Projects' },
  { href: '/history', label: 'History' },
  { href: '/business', label: 'Business' },
];

/** Compact monogram matching the supplied AccessFix references. */
export function Mark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="6" fill="var(--primary)" />
      <text
        x="16"
        y="23"
        fill="var(--primary-foreground)"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="22"
        fontWeight="700"
        textAnchor="middle"
      >
        A
      </text>
    </svg>
  );
}

function useAccount(path) {
  const [email, setEmail] = useState(null);
  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => active && setEmail(me.email))
      .catch(() => active && setEmail(null));
    return () => {
      active = false;
    };
  }, [path]);
  return [email, setEmail];
}

/**
 * @param {{ healthState: string, health: object | null, path: string, bare?: boolean,
 *   children: import('react').ReactNode }} props
 */
export function Shell({ healthState, health, path, bare = false, children }) {
  const [email, setEmail] = useAccount(path);
  const [menu, setMenu] = useState({ path: null, open: false });
  const open = menu.path === path && menu.open;

  const skip = (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      Skip to main content
    </a>
  );

  if (bare) {
    return (
      <>
        {skip}
        <main id="main">{children}</main>
      </>
    );
  }

  const signOut = () =>
    logout()
      .catch(() => {})
      .then(() => {
        setEmail(null);
        navigate('/');
      });

  return (
    <>
      {skip}
      <header className="sticky top-0 z-40 border-b bg-surface">
        <div className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 text-foreground no-underline"
          >
            <Mark />
            <span className="text-lg font-semibold tracking-tight">AccessFix</span>
          </Link>
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} path={path} />
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/#scan-form"
              className="hidden min-h-10 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground no-underline transition-[filter,transform] hover:brightness-110 active:translate-y-px sm:inline-flex sm:px-4"
            >
              New scan
            </Link>
            {health?.limits.privateUrlsAllowed && (
              <span className="hidden items-center gap-1 rounded-md border border-moderate px-2 py-1 text-xs text-moderate lg:inline-flex">
                <ShieldAlert aria-hidden="true" className="size-3.5" />
                Private network scanning enabled (dev only)
              </span>
            )}
            <div className="hidden rounded-md border border-input bg-background px-2.5 py-1.5 sm:block">
              <ApiStatus state={healthState} />
            </div>
            <ThemeControl />
            <div className="hidden lg:block">
              <Account email={email} onSignOut={signOut} />
            </div>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-md border border-input transition-colors hover:bg-raised lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() =>
                setMenu((value) => ({ path, open: value.path === path ? !value.open : true }))
              }
            >
              {open ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
              <span className="sr-only">Menu</span>
            </button>
          </div>
        </div>
        {open && (
          <div id="mobile-nav" className="border-t bg-surface px-4 pb-4 lg:hidden">
            <nav aria-label="Primary mobile">
              <ul className="grid gap-1 py-3">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} path={path} block />
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <ApiStatus state={healthState} />
              <Link
                href="/"
                className="inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground no-underline"
              >
                New scan
              </Link>
              <Account email={email} onSignOut={signOut} />
            </div>
          </div>
        )}
      </header>
      <main
        id="main"
        className="mx-auto min-w-0 w-full max-w-7xl overflow-x-clip px-4 py-8 sm:px-6 lg:py-10"
      >
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <p>AccessFix · automated WCAG 2.2 checks. A high score is not a compliance claim.</p>
          <p>
            <Link href="/business" className="text-link underline">
              Plans and limits
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}

function NavLink({ item, path, block = false }) {
  const current = item.href === '/' ? path === '/' : path.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`${block ? 'flex' : 'inline-flex'} min-h-10 items-center rounded-md px-3 text-sm no-underline transition-colors ${
        current
          ? 'bg-raised font-semibold text-foreground'
          : 'text-muted-foreground hover:bg-raised hover:text-foreground'
      }`}
      aria-current={current ? 'page' : undefined}
    >
      {item.label}
    </Link>
  );
}

function Account({ email, onSignOut }) {
  if (!email) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-10 items-center whitespace-nowrap rounded-md border px-4 text-sm font-medium no-underline hover:bg-raised"
      >
        Sign in
      </Link>
    );
  }
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex size-8 items-center justify-center rounded-full bg-raised text-xs font-semibold text-foreground"
      >
        {initials}
      </span>
      <span className="hidden max-w-[12rem] truncate text-sm lg:inline">{email}</span>
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-raised hover:text-foreground"
        onClick={onSignOut}
      >
        <LogOut aria-hidden="true" className="size-4" />
        Sign out<span className="sr-only"> {email}</span>
      </button>
    </div>
  );
}

const THEMES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function ThemeControl() {
  const [mode, setMode] = useState(() => document.documentElement.dataset.theme || 'system');
  return (
    <label className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-input bg-surface px-2.5 text-sm font-medium">
      <span>Theme</span>
      <select
        aria-label="Color theme"
        className="min-h-9 max-w-[5.5rem] cursor-pointer bg-transparent text-foreground outline-none"
        value={mode}
        onChange={(event) => setMode(saveTheme(event.target.value))}
      >
        {THEMES.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils.js';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Modal dialog with Escape handling, focus containment, restoration, and scroll locking. */
export function Dialog({
  open,
  onClose,
  labelledBy,
  label,
  fullScreen = false,
  children,
  className,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusable = () => [...(panel?.querySelectorAll(FOCUSABLE) ?? [])];
    const items = focusable();
    (items[0] ?? panel)?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (controls.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = controls[0];
      const last = controls.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-black/75',
        fullScreen ? '' : 'p-3 sm:p-6',
      )}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        tabIndex={-1}
        className={cn(
          fullScreen
            ? 'h-dvh max-h-dvh w-screen max-w-none overflow-hidden rounded-none border-0 bg-background p-0'
            : 'max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-auto rounded-lg border border-input bg-surface p-5 shadow-popover sm:max-h-[calc(100dvh-3rem)] sm:p-6',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

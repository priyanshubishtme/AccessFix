import { cloneElement, Children, useId } from 'react';
import { cn } from '@/lib/utils.js';

export function Tooltip({ children, label, className }) {
  const id = useId();
  const child = Children.only(children);
  const describedBy = [child.props['aria-describedby'], id].filter(Boolean).join(' ');
  return (
    <span className={cn('group relative inline-flex', className)}>
      {cloneElement(child, { 'aria-describedby': describedBy })}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 max-w-64 -translate-x-1/2 rounded-md border border-input bg-raised px-2.5 py-1.5 text-sm text-foreground opacity-0 shadow-popover transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

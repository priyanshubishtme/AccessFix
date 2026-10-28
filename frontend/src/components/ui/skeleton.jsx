import { cn } from '@/lib/utils.js';

export function Skeleton({ className, ...props }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-pulse rounded-md bg-raised motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

import { cn } from '@/lib/utils.js';

export function Card({ as: Component = 'section', className, ...props }) {
  return <Component className={cn('rounded-lg border bg-surface', className)} {...props} />;
}

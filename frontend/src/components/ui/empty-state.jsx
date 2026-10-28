import { cn } from '@/lib/utils.js';

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <section className={cn('rounded-lg border bg-surface px-5 py-10 text-center', className)}>
      {Icon && <Icon aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />}
      <h2 className="mt-3 text-xl font-semibold">{title}</h2>
      {children && (
        <div className="mx-auto mt-2 max-w-[60ch] text-base leading-6 text-muted-foreground">
          {children}
        </div>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </section>
  );
}

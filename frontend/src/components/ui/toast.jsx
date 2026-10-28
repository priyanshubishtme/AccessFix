import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const TONES = {
  error: { Icon: CircleAlert, role: 'alert', color: 'text-critical' },
  success: { Icon: CircleCheck, role: 'status', color: 'text-verified' },
  info: { Icon: Info, role: 'status', color: 'text-link' },
};

export function Toast({ tone = 'info', title, children, className, ...props }) {
  const { Icon, role, color } = TONES[tone] ?? TONES.info;
  return (
    <div
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cn(
        'flex gap-3 rounded-lg border border-input bg-surface p-4 text-base',
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', color)} />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}

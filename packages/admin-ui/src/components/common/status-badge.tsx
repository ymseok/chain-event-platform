import { cn } from '@/lib/utils';
import type { Status, SubscriptionStatus, WebhookLogStatus } from '@/types';

type StatusType = Status | SubscriptionStatus | WebhookLogStatus;

const statusConfig: Record<
  StatusType,
  { label: string; className: string; dotClassName: string }
> = {
  ACTIVE: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    dotClassName: 'bg-emerald-500',
  },
  INACTIVE: {
    label: 'Inactive',
    className: 'bg-muted text-muted-foreground border-border',
    dotClassName: 'bg-muted-foreground',
  },
  PAUSED: {
    label: 'Paused',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dotClassName: 'bg-amber-500',
  },
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dotClassName: 'bg-amber-500 animate-pulse',
  },
  SUCCESS: {
    label: 'Success',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    dotClassName: 'bg-emerald-500',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    dotClassName: 'bg-destructive',
  },
};

interface StatusBadgeProps {
  status: StatusType;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClassName)} />
      )}
      {config.label}
    </span>
  );
}

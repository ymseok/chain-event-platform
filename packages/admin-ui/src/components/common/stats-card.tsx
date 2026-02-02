import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'accent';
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
}: StatsCardProps) {
  return (
    <Card className={cn(
      'card-interactive border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden',
      variant === 'primary' && 'border-primary/30',
      variant === 'accent' && 'border-accent/30',
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                'text-3xl font-bold tracking-tight',
                variant === 'primary' && 'text-primary glow-text',
                variant === 'accent' && 'text-accent',
              )}>
                {value}
              </span>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.value >= 0 ? 'text-emerald-500' : 'text-destructive'
                  )}
                >
                  {trend.value >= 0 ? '+' : ''}
                  {trend.value}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              variant === 'primary' && 'bg-primary/10 text-primary',
              variant === 'accent' && 'bg-accent/10 text-accent',
              variant === 'default' && 'bg-secondary text-muted-foreground',
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

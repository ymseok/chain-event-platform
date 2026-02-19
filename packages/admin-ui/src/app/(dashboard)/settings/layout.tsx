'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Link2, Server, Send, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';

const settingsNavItems = [
  {
    title: 'Chains',
    href: '/settings/chains',
    icon: Link2,
    description: 'Manage blockchain networks',
  },
  {
    title: 'Event Ingestors',
    href: '/settings/ingestors',
    icon: Server,
    description: 'Monitor ingestor instances',
  },
  {
    title: 'Webhook Dispatchers',
    href: '/settings/dispatchers',
    icon: Send,
    description: 'Monitor dispatcher instances',
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isRoot = user?.isRoot ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage global platform configurations
        </p>
      </div>

      {!isRoot && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-yellow-500" />
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Settings are read-only. Only <span className="font-semibold">Root</span> accounts can modify global configurations.
          </p>
        </div>
      )}

      <div className="flex gap-8">
        <nav className="w-64 shrink-0">
          <div className="space-y-1">
            {settingsNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <div>
                    <p>{item.title}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

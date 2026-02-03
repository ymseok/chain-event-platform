'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AppWindow,
  Code2,
  Webhook,
  Bell,
  Settings,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/stores/app-store';

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Applications',
    href: '/applications',
    icon: AppWindow,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

const appNavItems = [
  {
    title: 'Overview',
    href: '',
    icon: LayoutDashboard,
  },
  {
    title: 'Programs',
    href: '/programs',
    icon: Code2,
  },
  {
    title: 'Webhooks',
    href: '/webhooks',
    icon: Webhook,
  },
  {
    title: 'Subscriptions',
    href: '/subscriptions',
    icon: Bell,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const currentApp = useAppStore((state) => state.currentApp);

  const isAppDetailPage = pathname.startsWith('/applications/') && currentApp;

  return (
    <div className="flex h-full w-72 flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border/50 px-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-80 blur-sm group-hover:opacity-100 transition-opacity" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground tracking-tight">Chain Event</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        <div className="mb-2">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Navigation
          </span>
        </div>
        {mainNavItems.map((item, index) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'animate-fade-in opacity-0',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              )}
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
              )}
              <item.icon className={cn(
                'h-4 w-4 transition-transform duration-200',
                isActive ? 'text-primary' : 'group-hover:scale-110'
              )} />
              <span>{item.title}</span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </Link>
          );
        })}

        {isAppDetailPage && (
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="mb-3 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Current App
              </span>
              <p className="mt-1 text-sm font-medium text-foreground truncate">
                {currentApp.name}
              </p>
            </div>
            {appNavItems.map((item, index) => {
              const fullHref = `/applications/${currentApp.id}${item.href}`;
              const isActive =
                item.href === ''
                  ? pathname === fullHref
                  : pathname.startsWith(fullHref);

              return (
                <Link
                  key={item.href}
                  href={fullHref}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    'animate-fade-in opacity-0',
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  )}
                  style={{ animationDelay: `${(index + 2) * 0.05}s`, animationFillMode: 'forwards' }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent shadow-[0_0_10px_hsl(var(--accent))]" />
                  )}
                  <item.icon className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isActive ? 'text-accent' : 'group-hover:scale-110'
                  )} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/50 p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 p-4 border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}

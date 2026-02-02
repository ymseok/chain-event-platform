'use client';

import { useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useApplication } from '@/lib/hooks';
import { useAppStore } from '@/lib/stores/app-store';

const tabs = [
  { name: 'Overview', href: '' },
  { name: 'Programs', href: '/programs' },
  { name: 'Webhooks', href: '/webhooks' },
  { name: 'Subscriptions', href: '/subscriptions' },
  { name: 'Settings', href: '/settings' },
];

export default function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const appId = params.id as string;

  const { data: app, isLoading } = useApplication(appId);
  const { setCurrentApp } = useAppStore();

  useEffect(() => {
    if (app) {
      setCurrentApp(app);
    }
  }, [app, setCurrentApp]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-semibold">Application not found</h2>
        <Button
          variant="link"
          onClick={() => router.push('/applications')}
          className="mt-4"
        >
          Back to Applications
        </Button>
      </div>
    );
  }

  const basePath = `/applications/${appId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/applications')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{app.name}</h1>
          {app.description && (
            <p className="text-muted-foreground">{app.description}</p>
          )}
        </div>
      </div>

      <nav className="flex border-b">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.href}`;
          const isActive =
            tab.href === ''
              ? pathname === basePath
              : pathname.startsWith(href);

          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}

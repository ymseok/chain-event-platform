'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Activity, Key, Webhook, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EventLogViewer } from '@/components/event-log';

export default function HomePage() {
  const [stats, setStats] = useState({ eventCount: 0, apiKeyCount: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Main content */}
      <div className="relative">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Webhook className="h-5 w-5 text-primary" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">
                      Demo Webhook
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Real-time event monitoring
                    </p>
                  </div>
                </div>
              </div>

              <nav className="flex items-center gap-2">
                <Link href="/settings">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Stats cards */}
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatsCard
              title="Events Received"
              value={stats.eventCount}
              icon={Activity}
              description="In current session"
              color="primary"
            />
            <StatsCard
              title="API Keys"
              value={stats.apiKeyCount}
              icon={Key}
              description="Active keys"
              color="violet"
              href="/settings"
            />
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Webhook Endpoint
                    </p>
                    <code className="text-sm font-mono text-primary">
                      /api/webhook
                    </code>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <ExternalLink className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  POST requests with X-API-Key header
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Event log viewer */}
          <div className="h-[calc(100vh-280px)] min-h-[500px]">
            <EventLogViewer />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: 'primary' | 'violet' | 'emerald';
  href?: string;
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  color,
  href,
}: StatsCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 border-primary/30 text-primary',
    violet: 'bg-violet-500/10 border-violet-500/30 text-violet-500',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
  };

  const content = (
    <Card
      className={cn(
        'border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-200',
        href && 'hover:border-primary/30 hover:bg-card/70 cursor-pointer'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
          </div>
          <div
            className={cn(
              'w-10 h-10 rounded-lg border flex items-center justify-center',
              colorClasses[color]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

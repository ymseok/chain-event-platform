'use client';

import { useRouter } from 'next/navigation';
import { AppWindow, Code2, Webhook, Bell, Plus, ArrowRight, Activity, Link2, RefreshCw, AlertCircle, CheckCircle2, Loader2, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, StatsCard, EmptyState, StatusBadge } from '@/components/common';
import { useApplications, useChainSyncStatuses, useTriggerIngestorRefresh, useDashboardStats } from '@/lib/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SyncStatus } from '@/types';
import { toast } from 'sonner';

function getSyncStatusInfo(status: SyncStatus) {
  switch (status) {
    case 'SYNCING':
      return { icon: Loader2, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Syncing', animate: true };
    case 'SYNCED':
      return { icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Synced', animate: false };
    case 'ERROR':
      return { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Error', animate: false };
    case 'STOPPED':
      return { icon: StopCircle, color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'Stopped', animate: false };
    default:
      return { icon: Activity, color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'Unknown', animate: false };
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useApplications(1, 5);
  const { data: dashboardStats, isLoading: isStatsLoading } = useDashboardStats();
  const { data: syncStatuses, isLoading: isSyncStatusLoading } = useChainSyncStatuses();
  const triggerRefresh = useTriggerIngestorRefresh();

  const handleRefresh = async () => {
    try {
      await triggerRefresh.mutateAsync();
      toast.success('Refresh signal sent successfully');
    } catch {
      toast.error('Failed to send refresh signal');
    }
  };

  if (isLoading || isStatsLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const applications = data?.data || [];
  const totalApps = data?.meta.total || 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Monitor your blockchain event infrastructure"
        actions={
          <Button
            onClick={() => router.push('/applications')}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: 'forwards' }}>
          <StatsCard
            title="Applications"
            value={dashboardStats?.applications ?? totalApps}
            icon={AppWindow}
            description="Total applications"
            variant="primary"
            onClick={() => router.push('/applications')}
          />
        </div>
        <div className="animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: 'forwards' }}>
          <StatsCard
            title="Programs"
            value={dashboardStats?.programs ?? 0}
            icon={Code2}
            description="Smart contracts tracked"
          />
        </div>
        <div className="animate-slide-up opacity-0 stagger-3" style={{ animationFillMode: 'forwards' }}>
          <StatsCard
            title="Webhooks"
            value={dashboardStats?.webhooks ?? 0}
            icon={Webhook}
            description="Active endpoints"
            variant="accent"
          />
        </div>
        <div className="animate-slide-up opacity-0 stagger-4" style={{ animationFillMode: 'forwards' }}>
          <StatsCard
            title="Subscriptions"
            value={dashboardStats?.subscriptions ?? 0}
            icon={Bell}
            description="Event subscriptions"
          />
        </div>
      </div>

      {/* Chain Sync Status */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-slide-up opacity-0 stagger-5" style={{ animationFillMode: 'forwards' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Chain Sync Status
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time blockchain synchronization status
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={triggerRefresh.isPending}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", triggerRefresh.isPending && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isSyncStatusLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !syncStatuses || syncStatuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Link2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                No chains are being tracked yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Start the blockchain-event-ingestor to begin tracking
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {syncStatuses.map((status, index) => {
                const statusInfo = getSyncStatusInfo(status.syncStatus);
                const StatusIcon = statusInfo.icon;
                return (
                  <div
                    key={status.id}
                    className={cn(
                      'rounded-xl border border-border/50 p-4',
                      'hover:border-primary/30 transition-all duration-200',
                      'animate-fade-in opacity-0'
                    )}
                    style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', statusInfo.bgColor)}>
                          <StatusIcon className={cn('h-5 w-5', statusInfo.color, statusInfo.animate && 'animate-spin')} />
                        </div>
                        <div>
                          <h4 className="font-medium">{status.chainName}</h4>
                          <p className="text-xs text-muted-foreground">
                            Chain ID: {status.networkChainId}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        statusInfo.bgColor,
                        statusInfo.color
                      )}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Latest Block</span>
                        <span className="font-mono">{Number(status.latestBlockNumber).toLocaleString()}</span>
                      </div>
                      {status.lastSyncedAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Synced</span>
                          <span className="text-xs">
                            {new Date(status.lastSyncedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      {status.lastError && (
                        <div className="mt-2 p-2 rounded bg-red-500/10 text-red-500 text-xs">
                          {status.lastError}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Applications */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm animate-slide-up opacity-0 stagger-4" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Applications</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Your latest blockchain monitoring setups
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/applications')}
              className="text-muted-foreground hover:text-foreground"
            >
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <EmptyState
                icon={AppWindow}
                title="No applications yet"
                description="Create your first application to start tracking blockchain events."
                action={{
                  label: 'Create Application',
                  onClick: () => router.push('/applications'),
                }}
              />
            ) : (
              <div className="space-y-3">
                {applications.map((app, index) => (
                  <div
                    key={app.id}
                    className={cn(
                      'group flex items-center justify-between rounded-xl border border-border/50 bg-secondary/30 p-4 cursor-pointer',
                      'hover:bg-secondary/50 hover:border-primary/30 transition-all duration-200',
                      'animate-fade-in opacity-0'
                    )}
                    style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
                    onClick={() => router.push(`/applications/${app.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                        <AppWindow className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium group-hover:text-primary transition-colors">
                          {app.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {app.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={app.status} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-slide-up opacity-0 stagger-5" style={{ animationFillMode: 'forwards' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Live Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted-foreground/50 animate-pulse" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Waiting for events...
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Activity will appear here in real-time
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

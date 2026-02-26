'use client';

import { useState } from 'react';
import { Send, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useDispatcherInstances, useRebalanceDispatchers } from '@/lib/hooks';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function DispatchersPage() {
  const [showRebalanceDialog, setShowRebalanceDialog] = useState(false);
  const { data, isLoading, isRefetching, error, refetch } =
    useDispatcherInstances();
  const rebalanceMutation = useRebalanceDispatchers();

  const user = useAuthStore((state) => state.user);
  const isRoot = user?.isRoot ?? false;

  const totalInstances = data?.instances.length ?? 0;
  const totalClaimedApps =
    data?.instances.reduce((sum, i) => sum + i.claimedApps.length, 0) ?? 0;
  const totalUnclaimedApps = data?.unclaimedApps.length ?? 0;
  const totalApps = totalClaimedApps + totalUnclaimedApps;

  const handleRebalance = () => {
    rebalanceMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(result.message);
        setShowRebalanceDialog(false);
      },
      onError: () => {
        toast.error('Failed to rebalance dispatchers');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load dispatcher instances</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Webhook Dispatchers</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            onClick={() => setShowRebalanceDialog(true)}
            disabled={!isRoot || totalInstances < 2}
            size="sm"
            title={!isRoot ? 'Root access required' : undefined}
          >
            Rebalance
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Instances</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalInstances}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Apps</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalApps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unclaimed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalUnclaimedApps}</p>
          </CardContent>
        </Card>
      </div>

      {/* Instance Cards */}
      {totalInstances === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Send className="h-8 w-8 mb-2" />
            <p>No active dispatcher instances</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data!.instances.map((instance) => (
            <Card key={instance.instanceId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {instance.instanceId}
                  </CardTitle>
                  <Badge variant="secondary">
                    {instance.claimedApps.length} app
                    {instance.claimedApps.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {instance.claimedApps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No applications claimed
                  </p>
                ) : (
                  <div className="space-y-2">
                    {instance.claimedApps.map((app) => (
                      <div
                        key={app.appId}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{app.appName}</span>
                          <span className="ml-2 text-muted-foreground text-xs">
                            {app.appId.slice(0, 8)}...
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          TTL {app.leaseTtlRemaining}s
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Unclaimed Apps */}
      {totalUnclaimedApps > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Unclaimed Applications
            </CardTitle>
            <CardDescription>
              These applications are not being dispatched by any instance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data!.unclaimedApps.map((app) => (
                <div
                  key={app.appId}
                  className="flex items-center rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{app.appName}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    {app.appId.slice(0, 8)}...
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showRebalanceDialog}
        onOpenChange={setShowRebalanceDialog}
        title="Rebalance Dispatchers"
        description="This will release excess claims from over-loaded instances so under-loaded instances can pick them up. The redistribution happens automatically within ~10 seconds."
        confirmLabel="Rebalance"
        onConfirm={handleRebalance}
        isLoading={rebalanceMutation.isPending}
      />
    </div>
  );
}

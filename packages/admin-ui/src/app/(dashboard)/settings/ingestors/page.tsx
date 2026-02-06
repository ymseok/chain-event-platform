'use client';

import { useState } from 'react';
import { Server, RefreshCw, AlertCircle } from 'lucide-react';
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
import { useIngestorInstances, useRebalanceIngestors } from '@/lib/hooks';

export default function IngestorsPage() {
  const [showRebalanceDialog, setShowRebalanceDialog] = useState(false);
  const { data, isLoading, error } = useIngestorInstances();
  const rebalanceMutation = useRebalanceIngestors();

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
        toast.error('Failed to rebalance ingestors');
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
        <p>Failed to load ingestor instances</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Event Ingestors</h2>
        <Button
          onClick={() => setShowRebalanceDialog(true)}
          disabled={totalInstances < 2}
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Rebalance
        </Button>
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
            <Server className="h-8 w-8 mb-2" />
            <p>No active ingestor instances</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data!.instances.map((instance) => (
            <Card key={instance.instanceId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Server className="h-4 w-4" />
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
              These applications are not being monitored by any ingestor
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
        title="Rebalance Ingestors"
        description="This will release excess claims from over-loaded instances so under-loaded instances can pick them up. The redistribution happens automatically within ~10 seconds."
        confirmLabel="Rebalance"
        onConfirm={handleRebalance}
        isLoading={rebalanceMutation.isPending}
      />
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, RefreshCcw, Pencil, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  StatusBadge,
  DataTable,
  CodeBlock,
  EmptyState,
} from '@/components/common';
import { EventTimeSeriesChart } from '@/components/charts';
import {
  useWebhook,
  useWebhookLogs,
  useWebhookLogStats,
  useTestWebhook,
  useRetryWebhookLog,
} from '@/lib/hooks';
import { webhookLogKeys } from '@/lib/hooks/use-webhook-logs';
import { useQueryClient } from '@tanstack/react-query';
import { formatDateTime, truncateMiddle } from '@/lib/utils';
import type { WebhookLog, WebhookLogStatus } from '@/types';
import type { Column } from '@/components/common/data-table';
import { EditWebhookDialog } from './edit-webhook-dialog';

export default function WebhookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const webhookId = params.id as string;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<WebhookLogStatus | 'ALL'>(
    'ALL'
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: webhook, isLoading: webhookLoading } = useWebhook(webhookId);
  const { data: logs, isLoading: logsLoading } = useWebhookLogs(
    webhookId,
    page,
    20,
    statusFilter === 'ALL' ? undefined : statusFilter
  );
  const { data: statsData, isLoading: statsLoading } = useWebhookLogStats(
    webhookId,
    30,
    { refetchInterval: autoRefresh ? 5000 : false }
  );
  const testMutation = useTestWebhook();
  const retryMutation = useRetryWebhookLog();

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: webhookLogKeys.list(webhookId, page, 20, statusFilter === 'ALL' ? undefined : statusFilter),
        });
      }, 5000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, queryClient, webhookId, page, statusFilter]);

  const handleTest = async () => {
    try {
      const result = await testMutation.mutateAsync(webhookId);
      if (result.success) {
        toast.success('Test webhook sent successfully');
      } else {
        toast.error(result.message || 'Test failed');
      }
    } catch (error) {
      toast.error('Failed to test webhook');
    }
  };

  const handleRetry = async (logId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await retryMutation.mutateAsync(logId);
      toast.success('Retry scheduled');
    } catch (error) {
      toast.error('Failed to retry');
    }
  };

  // Get API Key from headers and mask it for display
  const getApiKey = () => {
    if (!webhook?.headers || !('X-API-Key' in webhook.headers)) {
      return null;
    }
    return webhook.headers['X-API-Key'];
  };

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) {
      return apiKey.substring(0, 2) + '****';
    }
    return apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4);
  };

  if (webhookLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!webhook) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-semibold">Webhook not found</h2>
        <Button variant="link" onClick={() => router.back()} className="mt-4">
          Go back
        </Button>
      </div>
    );
  }

  const columns: Column<WebhookLog>[] = [
    {
      header: 'Status',
      cell: (log) => <StatusBadge status={log.status} />,
      className: 'w-24',
    },
    {
      header: 'Response',
      cell: (log) => (
        <span
          className={`font-mono text-sm ${
            log.responseStatus && log.responseStatus >= 200 && log.responseStatus < 300
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {log.responseStatus || '-'}
        </span>
      ),
      className: 'w-24',
    },
    {
      header: 'Response Time',
      cell: (log) =>
        log.responseTimeMs ? `${log.responseTimeMs}ms` : '-',
      className: 'w-32',
    },
    {
      header: 'Attempts',
      cell: (log) => log.attemptCount,
      className: 'w-24',
    },
    {
      header: 'Created',
      cell: (log) => formatDateTime(log.createdAt),
      className: 'w-44',
    },
    {
      header: '',
      cell: (log) =>
        log.status === 'FAILED' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => handleRetry(log.id, e)}
            disabled={retryMutation.isPending}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        ),
      className: 'w-12',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{webhook.name}</h1>
            <StatusBadge status={webhook.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {truncateMiddle(webhook.url, 40, 20)}
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button onClick={handleTest} disabled={testMutation.isPending}>
          <Play className="mr-2 h-4 w-4" />
          {testMutation.isPending ? 'Testing...' : 'Test'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">URL</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm break-all">{webhook.url}</code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Key</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const apiKey = getApiKey();
              if (apiKey) {
                return (
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                    <code className="text-sm">{maskApiKey(apiKey)}</code>
                  </div>
                );
              }
              return (
                <span className="text-sm text-muted-foreground">
                  Not configured
                </span>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retry Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p>Max Retries: {webhook.retryPolicy.maxRetries}</p>
              <p>Interval: {webhook.retryPolicy.retryInterval}ms</p>
              <p>Backoff: {webhook.retryPolicy.backoffMultiplier}x</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Delivery Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <EventTimeSeriesChart data={statsData || []} isLoading={statsLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Delivery Logs</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
                Auto-refresh (5s)
              </Label>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as WebhookLogStatus | 'ALL')
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!logsLoading && logs?.data.length === 0 ? (
            <EmptyState
              icon={Play}
              title="No logs yet"
              description="Delivery logs will appear here once events are dispatched to this webhook."
            />
          ) : (
            <DataTable
              columns={columns}
              data={logs?.data || []}
              isLoading={logsLoading}
              pagination={logs?.meta}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <EditWebhookDialog
        webhook={webhook}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}

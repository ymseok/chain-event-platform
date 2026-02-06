'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Webhook, Trash2, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DataTable,
  EmptyState,
  ConfirmDialog,
} from '@/components/common';
import { useWebhooks, useDeleteWebhook, useTestWebhook } from '@/lib/hooks';
import { healthCheckWebhook } from '@/lib/api/webhooks';
import { formatDate, truncateMiddle, cn } from '@/lib/utils';
import { CreateWebhookDialog } from './create-webhook-dialog';
import type { Webhook as WebhookType } from '@/types';
import type { Column } from '@/components/common/data-table';

type HealthStatus = 'checking' | 'active' | 'inactive';

interface HealthStatusBadgeProps {
  status: HealthStatus;
}

function HealthStatusBadge({ status }: HealthStatusBadgeProps) {
  if (status === 'checking') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground border-border">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking
      </span>
    );
  }

  const config = {
    active: {
      label: 'Active',
      className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      dotClassName: 'bg-emerald-500',
    },
    inactive: {
      label: 'Inactive',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
      dotClassName: 'bg-destructive',
    },
  };

  const { label, className, dotClassName } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotClassName)} />
      {label}
    </span>
  );
}

export default function WebhooksPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);
  const [healthStatuses, setHealthStatuses] = useState<Record<string, HealthStatus>>({});

  const { data, isLoading } = useWebhooks(appId, page, 20);
  const deleteMutation = useDeleteWebhook();
  const testMutation = useTestWebhook();

  const checkWebhookHealth = useCallback(async (webhookId: string) => {
    setHealthStatuses((prev) => ({ ...prev, [webhookId]: 'checking' }));
    try {
      const result = await healthCheckWebhook(webhookId);
      setHealthStatuses((prev) => ({
        ...prev,
        [webhookId]: result.success ? 'active' : 'inactive',
      }));
    } catch {
      setHealthStatuses((prev) => ({ ...prev, [webhookId]: 'inactive' }));
    }
  }, []);

  useEffect(() => {
    if (data?.data && data.data.length > 0) {
      data.data.forEach((webhook) => {
        if (!healthStatuses[webhook.id]) {
          checkWebhookHealth(webhook.id);
        }
      });
    }
  }, [data?.data, checkWebhookHealth, healthStatuses]);

  const handleDelete = async () => {
    if (!webhookToDelete) return;
    try {
      await deleteMutation.mutateAsync(webhookToDelete);
      toast.success('Webhook deleted');
      setWebhookToDelete(null);
    } catch (error) {
      toast.error('Failed to delete webhook');
    }
  };

  const handleTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await testMutation.mutateAsync(id);
      if (result.success) {
        toast.success('Test webhook sent successfully');
      } else {
        toast.error(result.message || 'Test failed');
      }
    } catch (error) {
      toast.error('Failed to test webhook');
    }
  };

  const columns: Column<WebhookType>[] = [
    {
      header: 'Name',
      cell: (webhook) => (
        <div>
          <p className="font-medium">{webhook.name}</p>
          <p className="text-sm text-muted-foreground">
            {truncateMiddle(webhook.url, 30, 15)}
          </p>
        </div>
      ),
    },
    {
      header: 'Subscriptions',
      cell: (webhook) => webhook._count?.subscriptions ?? 0,
      className: 'w-32',
    },
    {
      header: 'Status',
      cell: (webhook) => (
        <HealthStatusBadge status={healthStatuses[webhook.id] || 'checking'} />
      ),
      className: 'w-28',
    },
    {
      header: 'Created',
      cell: (webhook) => formatDate(webhook.createdAt),
      className: 'w-32',
    },
    {
      header: '',
      cell: (webhook) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => handleTest(webhook.id, e)}
            disabled={testMutation.isPending}
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setWebhookToDelete(webhook.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: 'w-24',
    },
  ];

  const handleRowClick = (webhook: WebhookType) => {
    router.push(`/webhooks/${webhook.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!isLoading && data?.data.length === 0 ? (
            <EmptyState
              icon={Webhook}
              title="No webhooks"
              description="Create a webhook endpoint to receive event notifications."
              action={{
                label: 'Add Webhook',
                onClick: () => setIsCreateOpen(true),
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={data?.data || []}
              isLoading={isLoading}
              pagination={data?.meta}
              onPageChange={setPage}
              onRowClick={handleRowClick}
            />
          )}
        </CardContent>
      </Card>

      <CreateWebhookDialog
        appId={appId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <ConfirmDialog
        open={!!webhookToDelete}
        onOpenChange={(open) => !open && setWebhookToDelete(null)}
        title="Delete Webhook"
        description="Are you sure you want to delete this webhook? All associated subscriptions will also be deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

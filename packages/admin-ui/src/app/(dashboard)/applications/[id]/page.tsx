'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Code2,
  Webhook,
  Bell,
  Activity,
  Plus,
  Copy,
  Trash2,
  Key,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StatsCard,
  DataTable,
  ConfirmDialog,
  EmptyState,
} from '@/components/common';
import { useApplicationStats, useApiKeys, useRevokeApiKey } from '@/lib/hooks';
import { copyToClipboard, formatDate, truncateMiddle } from '@/lib/utils';
import { CreateApiKeyDialog } from './create-api-key-dialog';
import type { ApiKey } from '@/types';
import type { Column } from '@/components/common/data-table';

export default function ApplicationOverviewPage() {
  const params = useParams();
  const appId = params.id as string;

  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useApplicationStats(appId);
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys(appId);
  const revokeMutation = useRevokeApiKey(appId);

  const handleCopyKey = async (prefix: string) => {
    await copyToClipboard(prefix);
    toast.success('Key prefix copied to clipboard');
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;
    try {
      await revokeMutation.mutateAsync(keyToRevoke);
      toast.success('API key revoked');
      setKeyToRevoke(null);
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const columns: Column<ApiKey>[] = [
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Key',
      cell: (key) => (
        <div className="flex items-center gap-2">
          <code className="text-sm bg-muted px-2 py-1 rounded">
            {key.keyPrefix}...
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyKey(key.keyPrefix);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      header: 'Created',
      cell: (key) => formatDate(key.createdAt),
    },
    {
      header: 'Last Used',
      cell: (key) => (key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'),
    },
    {
      header: 'Status',
      cell: (key) => (
        <span
          className={`text-sm ${
            key.revokedAt ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {key.revokedAt ? 'Revoked' : 'Active'}
        </span>
      ),
    },
    {
      header: '',
      cell: (key) =>
        !key.revokedAt && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setKeyToRevoke(key.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      className: 'w-12',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Programs"
          value={stats?.programs.total ?? '-'}
          icon={Code2}
          description="Smart contracts"
        />
        <StatsCard
          title="Webhooks"
          value={stats?.webhooks.total ?? '-'}
          icon={Webhook}
          description="Endpoints"
        />
        <StatsCard
          title="Subscriptions"
          value={stats?.subscriptions.total ?? '-'}
          icon={Bell}
          description="Active subscriptions"
        />
        <StatsCard
          title="Success Rate"
          value={
            stats?.deliveries.successRate !== undefined
              ? `${stats.deliveries.successRate.toFixed(1)}%`
              : '-'
          }
          icon={Activity}
          description="Webhook delivery"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>API Keys</CardTitle>
          <Button size="sm" onClick={() => setIsCreateKeyOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Key
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              There are currently no public APIs available for external use via API keys. API key based access will be supported in a future update.
            </p>
          </div>
          {!keysLoading && apiKeys?.data?.length === 0 ? (
            <EmptyState
              icon={Key}
              title="No API keys"
              description="Create an API key to authenticate requests to your application."
              action={{
                label: 'Create API Key',
                onClick: () => setIsCreateKeyOpen(true),
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={apiKeys?.data || []}
              isLoading={keysLoading}
              pagination={apiKeys?.meta}
            />
          )}
        </CardContent>
      </Card>

      <CreateApiKeyDialog
        appId={appId}
        open={isCreateKeyOpen}
        onOpenChange={setIsCreateKeyOpen}
      />

      <ConfirmDialog
        open={!!keyToRevoke}
        onOpenChange={(open) => !open && setKeyToRevoke(null)}
        title="Revoke API Key"
        description="Are you sure you want to revoke this API key? This action cannot be undone and any requests using this key will fail."
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={handleRevokeKey}
        isLoading={revokeMutation.isPending}
      />
    </div>
  );
}

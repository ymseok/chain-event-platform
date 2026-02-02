'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Bell, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DataTable,
  StatusBadge,
  EmptyState,
  ConfirmDialog,
} from '@/components/common';
import { useSubscriptions, useDeleteSubscription } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import { CreateSubscriptionDialog } from './create-subscription-dialog';
import type { Subscription } from '@/types';
import type { Column } from '@/components/common/data-table';

export default function SubscriptionsPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<
    string | null
  >(null);

  const { data, isLoading } = useSubscriptions(appId, page, 20);
  const deleteMutation = useDeleteSubscription();

  const handleDelete = async () => {
    if (!subscriptionToDelete) return;
    try {
      await deleteMutation.mutateAsync(subscriptionToDelete);
      toast.success('Subscription deleted');
      setSubscriptionToDelete(null);
    } catch (error) {
      toast.error('Failed to delete subscription');
    }
  };

  const columns: Column<Subscription>[] = [
    {
      header: 'Event',
      cell: (sub) => (
        <div>
          <p className="font-medium">{sub.event?.name || 'Unknown Event'}</p>
          <p className="text-sm text-muted-foreground">
            {sub.event?.program?.name || 'Unknown Program'}
          </p>
        </div>
      ),
    },
    {
      header: 'Webhook',
      cell: (sub) => sub.webhook?.name || 'Unknown Webhook',
    },
    {
      header: 'Filters',
      cell: (sub) => (
        <span className="text-muted-foreground">
          {sub.filterConditions?.length || 0} conditions
        </span>
      ),
      className: 'w-24',
    },
    {
      header: 'Status',
      cell: (sub) => <StatusBadge status={sub.status} />,
      className: 'w-24',
    },
    {
      header: 'Created',
      cell: (sub) => formatDate(sub.createdAt),
      className: 'w-32',
    },
    {
      header: '',
      cell: (sub) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setSubscriptionToDelete(sub.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
      className: 'w-12',
    },
  ];

  const handleRowClick = (sub: Subscription) => {
    router.push(`/subscriptions/${sub.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!isLoading && data?.data.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No subscriptions"
              description="Create a subscription to connect events to webhooks."
              action={{
                label: 'Add Subscription',
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

      <CreateSubscriptionDialog
        appId={appId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <ConfirmDialog
        open={!!subscriptionToDelete}
        onOpenChange={(open) => !open && setSubscriptionToDelete(null)}
        title="Delete Subscription"
        description="Are you sure you want to delete this subscription?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

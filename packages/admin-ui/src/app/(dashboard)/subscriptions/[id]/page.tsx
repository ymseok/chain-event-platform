'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, CodeBlock } from '@/components/common';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubscription, useUpdateSubscription } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import type { SubscriptionStatus } from '@/types';

export default function SubscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.id as string;

  const { data: subscription, isLoading } = useSubscription(subscriptionId);
  const updateMutation = useUpdateSubscription();

  const handleStatusChange = async (status: SubscriptionStatus) => {
    try {
      await updateMutation.mutateAsync({
        id: subscriptionId,
        data: { status },
      });
      toast.success(`Subscription ${status.toLowerCase()}`);
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-semibold">Subscription not found</h2>
        <Button variant="link" onClick={() => router.back()} className="mt-4">
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Subscription Details</h1>
            <StatusBadge status={subscription.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {subscription.event?.name} → {subscription.webhook?.name}
          </p>
        </div>
        <Select
          value={subscription.status}
          onValueChange={(value) =>
            handleStatusChange(value as SubscriptionStatus)
          }
          disabled={updateMutation.isPending}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{subscription.event?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Program</p>
              <p>{subscription.event?.program?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Signature</p>
              <code className="text-sm">{subscription.event?.signature}</code>
            </div>
            {subscription.event?.parameters && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Parameters</p>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {subscription.event.parameters}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{subscription.webhook?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">URL</p>
              <p className="text-sm break-all">{subscription.webhook?.url}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              {subscription.webhook && (
                <StatusBadge status={subscription.webhook.status} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription.filterConditions &&
          subscription.filterConditions.length > 0 ? (
            <CodeBlock
              code={JSON.stringify(subscription.filterConditions, null, 2)}
            />
          ) : (
            <p className="text-muted-foreground">
              No filter conditions configured. All events will be forwarded to the
              webhook.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{formatDate(subscription.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Updated</p>
              <p>{formatDate(subscription.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

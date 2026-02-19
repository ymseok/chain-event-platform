'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FilterConditionBuilder } from '@/components/common';
import { useCreateSubscription, usePrograms, useEvents, useWebhooks } from '@/lib/hooks';
import type { FilterCondition } from '@/types';

const createSubscriptionSchema = z.object({
  programId: z.string().min(1, 'Program is required'),
  eventIds: z.array(z.string()).min(1, 'At least one event is required'),
  webhookId: z.string().min(1, 'Webhook is required'),
});

type CreateSubscriptionForm = z.infer<typeof createSubscriptionSchema>;

interface CreateSubscriptionDialogProps {
  appId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSubscriptionDialog({
  appId,
  open,
  onOpenChange,
}: CreateSubscriptionDialogProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: programs } = usePrograms(appId, 1, 100);
  const { data: events } = useEvents(selectedProgramId, 1, 100);
  const { data: webhooks } = useWebhooks(appId, 1, 100);

  const createMutation = useCreateSubscription(appId);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateSubscriptionForm>({
    resolver: zodResolver(createSubscriptionSchema),
  });

  const watchedProgramId = watch('programId');
  const watchedEventIds = watch('eventIds') || [];

  useEffect(() => {
    if (watchedProgramId) {
      setSelectedProgramId(watchedProgramId);
      setValue('eventIds', []);
      setFilterConditions([]);
      setShowFilters(false);
    }
  }, [watchedProgramId, setValue]);

  // Reset filters when event selection changes away from single
  useEffect(() => {
    if (watchedEventIds.length !== 1) {
      setFilterConditions([]);
      setShowFilters(false);
    }
  }, [watchedEventIds.length]);

  const selectedEvent =
    watchedEventIds.length === 1
      ? events?.data?.find((e) => e.id === watchedEventIds[0])
      : undefined;

  const onSubmit = async (data: CreateSubscriptionForm) => {
    try {
      const hasFilters = filterConditions.length > 0 && data.eventIds.length === 1;

      const results = await Promise.allSettled(
        data.eventIds.map((eventId) =>
          createMutation.mutateAsync({
            eventId,
            webhookId: data.webhookId,
            ...(hasFilters && eventId === data.eventIds[0]
              ? { filterConditions }
              : {}),
          })
        )
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.filter((r) => r.status === 'rejected').length;

      if (failCount === 0) {
        toast.success(`${successCount} subscription(s) created successfully`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} created, ${failCount} failed`);
      } else {
        toast.error('Failed to create subscriptions');
      }

      reset();
      setSelectedProgramId('');
      setFilterConditions([]);
      setShowFilters(false);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create subscriptions');
    }
  };

  const handleEventToggle = (eventId: string, checked: boolean) => {
    const currentEventIds = watch('eventIds') || [];
    if (checked) {
      setValue('eventIds', [...currentEventIds, eventId]);
    } else {
      setValue('eventIds', currentEventIds.filter((id) => id !== eventId));
    }
  };

  const handleClose = () => {
    reset();
    setSelectedProgramId('');
    setFilterConditions([]);
    setShowFilters(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Subscription</DialogTitle>
          <DialogDescription>
            Connect an event to a webhook to receive notifications.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Program</Label>
              <Select
                onValueChange={(value) => setValue('programId', value)}
                value={watch('programId')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.data?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.programId && (
                <p className="text-sm text-destructive">
                  {errors.programId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Events</Label>
              <div
                className={`rounded-md border ${
                  !selectedProgramId ? 'bg-muted opacity-50' : ''
                }`}
              >
                <div className="max-h-48 overflow-y-auto p-2 space-y-2">
                  {!selectedProgramId ? (
                    <p className="text-sm text-muted-foreground p-2">
                      Select a program first
                    </p>
                  ) : events?.data?.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">
                      No events available
                    </p>
                  ) : (
                    events?.data?.map((event) => (
                      <label
                        key={event.id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={(watch('eventIds') || []).includes(event.id)}
                          onCheckedChange={(checked) =>
                            handleEventToggle(event.id, checked as boolean)
                          }
                        />
                        <span className="text-sm">{event.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              {(watch('eventIds') || []).length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {(watch('eventIds') || []).length} event(s) selected
                </p>
              )}
              {errors.eventIds && (
                <p className="text-sm text-destructive">
                  {errors.eventIds.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Webhook</Label>
              <Select
                onValueChange={(value) => setValue('webhookId', value)}
                value={watch('webhookId')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select webhook" />
                </SelectTrigger>
                <SelectContent>
                  {webhooks?.data?.map((webhook) => (
                    <SelectItem key={webhook.id} value={webhook.id}>
                      {webhook.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.webhookId && (
                <p className="text-sm text-destructive">
                  {errors.webhookId.message}
                </p>
              )}
            </div>

            {watchedEventIds.length === 1 && selectedEvent && (
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-medium hover:text-foreground text-muted-foreground transition-colors"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Filter Conditions (optional)
                </button>
                {showFilters && (
                  <div className="rounded-md border p-3">
                    <FilterConditionBuilder
                      conditions={filterConditions}
                      onChange={setFilterConditions}
                      parameters={selectedEvent.parameters}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

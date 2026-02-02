'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useCreateSubscription, usePrograms, useEvents, useWebhooks } from '@/lib/hooks';

const createSubscriptionSchema = z.object({
  programId: z.string().min(1, 'Program is required'),
  eventId: z.string().min(1, 'Event is required'),
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

  useEffect(() => {
    if (watchedProgramId) {
      setSelectedProgramId(watchedProgramId);
      setValue('eventId', '');
    }
  }, [watchedProgramId, setValue]);

  const onSubmit = async (data: CreateSubscriptionForm) => {
    try {
      await createMutation.mutateAsync({
        eventId: data.eventId,
        webhookId: data.webhookId,
      });
      toast.success('Subscription created successfully');
      reset();
      setSelectedProgramId('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create subscription');
    }
  };

  const handleClose = () => {
    reset();
    setSelectedProgramId('');
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
                  {programs?.data.map((program) => (
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
              <Label>Event</Label>
              <Select
                onValueChange={(value) => setValue('eventId', value)}
                value={watch('eventId')}
                disabled={!selectedProgramId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events?.data.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.eventId && (
                <p className="text-sm text-destructive">
                  {errors.eventId.message}
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
                  {webhooks?.data.map((webhook) => (
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

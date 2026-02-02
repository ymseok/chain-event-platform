'use client';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWebhook } from '@/lib/hooks';

const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  url: z.string().url('Invalid URL'),
  apiKey: z.string().optional(),
});

type CreateWebhookForm = z.infer<typeof createWebhookSchema>;

interface CreateWebhookDialogProps {
  appId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWebhookDialog({
  appId,
  open,
  onOpenChange,
}: CreateWebhookDialogProps) {
  const createMutation = useCreateWebhook(appId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWebhookForm>({
    resolver: zodResolver(createWebhookSchema),
  });

  const onSubmit = async (data: CreateWebhookForm) => {
    try {
      // Filter out empty apiKey
      const payload = {
        name: data.name,
        url: data.url,
        ...(data.apiKey && { apiKey: data.apiKey }),
      };
      await createMutation.mutateAsync(payload);
      toast.success('Webhook created successfully');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create webhook');
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Webhook</DialogTitle>
          <DialogDescription>
            Create a webhook endpoint to receive event notifications.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Webhook"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/webhook"
                {...register('url')}
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (Optional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter API key for X-API-Key header"
                {...register('apiKey')}
              />
              <p className="text-xs text-muted-foreground">
                If your webhook endpoint requires authentication, enter the API key here.
                It will be sent as X-API-Key header.
              </p>
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

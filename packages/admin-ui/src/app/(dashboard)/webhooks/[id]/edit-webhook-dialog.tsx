'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateWebhook } from '@/lib/hooks';
import type { Webhook, Status } from '@/types';

const updateWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  url: z.string().url('Invalid URL'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  maxRetries: z.coerce.number().min(0).max(10),
  retryInterval: z.coerce.number().min(100).max(60000),
  backoffMultiplier: z.coerce.number().min(1).max(10),
});

type UpdateWebhookForm = z.infer<typeof updateWebhookSchema>;

interface EditWebhookDialogProps {
  webhook: Webhook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWebhookDialog({
  webhook,
  open,
  onOpenChange,
}: EditWebhookDialogProps) {
  const updateMutation = useUpdateWebhook();
  const [changeApiKey, setChangeApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Check if webhook has an API key configured
  const hasExistingApiKey = webhook.headers && 'X-API-Key' in webhook.headers;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateWebhookForm>({
    resolver: zodResolver(updateWebhookSchema),
    defaultValues: {
      name: webhook.name,
      url: webhook.url,
      status: webhook.status,
      maxRetries: webhook.retryPolicy.maxRetries,
      retryInterval: webhook.retryPolicy.retryInterval,
      backoffMultiplier: webhook.retryPolicy.backoffMultiplier,
    },
  });

  // Reset form when webhook changes
  useEffect(() => {
    reset({
      name: webhook.name,
      url: webhook.url,
      status: webhook.status,
      maxRetries: webhook.retryPolicy.maxRetries,
      retryInterval: webhook.retryPolicy.retryInterval,
      backoffMultiplier: webhook.retryPolicy.backoffMultiplier,
    });
    setChangeApiKey(false);
    setNewApiKey('');
    setShowApiKey(false);
  }, [webhook, reset]);

  const onSubmit = async (data: UpdateWebhookForm) => {
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        url: data.url,
        status: data.status,
        retryPolicy: {
          maxRetries: data.maxRetries,
          retryInterval: data.retryInterval,
          backoffMultiplier: data.backoffMultiplier,
        },
      };

      // Only include apiKey if user wants to change it and provided a new value
      if (changeApiKey && newApiKey.trim()) {
        payload.apiKey = newApiKey.trim();
      }

      await updateMutation.mutateAsync({
        id: webhook.id,
        data: payload,
      });
      toast.success('Webhook updated successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update webhook');
    }
  };

  const handleClose = () => {
    reset();
    setChangeApiKey(false);
    setNewApiKey('');
    setShowApiKey(false);
    onOpenChange(false);
  };

  const statusValue = watch('status');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Webhook</DialogTitle>
          <DialogDescription>
            Update webhook settings and configuration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="My Webhook" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* URL */}
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusValue}
                onValueChange={(value: Status) => setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Key Section */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">API Key Authentication</Label>
              </div>

              {hasExistingApiKey && !changeApiKey && (
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    API Key is configured (hidden for security)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setChangeApiKey(true)}
                  >
                    Change
                  </Button>
                </div>
              )}

              {!hasExistingApiKey && !changeApiKey && (
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    No API Key configured
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setChangeApiKey(true)}
                  >
                    Add
                  </Button>
                </div>
              )}

              {changeApiKey && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Enter new API key"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The new API key will be sent as X-API-Key header.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setChangeApiKey(false);
                      setNewApiKey('');
                      setShowApiKey(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Retry Policy */}
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="text-sm font-medium">Retry Policy</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="maxRetries" className="text-xs text-muted-foreground">
                    Max Retries
                  </Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min={0}
                    max={10}
                    {...register('maxRetries')}
                  />
                  {errors.maxRetries && (
                    <p className="text-xs text-destructive">
                      {errors.maxRetries.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="retryInterval" className="text-xs text-muted-foreground">
                    Interval (ms)
                  </Label>
                  <Input
                    id="retryInterval"
                    type="number"
                    min={100}
                    max={60000}
                    {...register('retryInterval')}
                  />
                  {errors.retryInterval && (
                    <p className="text-xs text-destructive">
                      {errors.retryInterval.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="backoffMultiplier" className="text-xs text-muted-foreground">
                    Backoff (x)
                  </Label>
                  <Input
                    id="backoffMultiplier"
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    {...register('backoffMultiplier')}
                  />
                  {errors.backoffMultiplier && (
                    <p className="text-xs text-destructive">
                      {errors.backoffMultiplier.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

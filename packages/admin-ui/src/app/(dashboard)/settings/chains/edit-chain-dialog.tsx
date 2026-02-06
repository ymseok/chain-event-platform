'use client';

import { useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateChain } from '@/lib/hooks';
import type { Chain } from '@/types';

const updateChainSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  chainId: z.coerce.number().int().positive('Chain ID must be a positive integer'),
  rpcUrl: z.string().url('Invalid URL format'),
  blockTime: z.coerce
    .number()
    .int()
    .min(1, 'Block time must be at least 1 second')
    .max(3600, 'Block time must be at most 3600 seconds'),
  enabled: z.boolean(),
});

type UpdateChainForm = z.infer<typeof updateChainSchema>;

interface EditChainDialogProps {
  chain: Chain;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditChainDialog({
  chain,
  open,
  onOpenChange,
}: EditChainDialogProps) {
  const updateMutation = useUpdateChain();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateChainForm>({
    resolver: zodResolver(updateChainSchema),
    defaultValues: {
      name: chain.name,
      chainId: chain.chainId,
      rpcUrl: chain.rpcUrl,
      blockTime: chain.blockTime,
      enabled: chain.enabled,
    },
  });

  const enabled = watch('enabled');

  useEffect(() => {
    reset({
      name: chain.name,
      chainId: chain.chainId,
      rpcUrl: chain.rpcUrl,
      blockTime: chain.blockTime,
      enabled: chain.enabled,
    });
  }, [chain, reset]);

  const onSubmit = async (data: UpdateChainForm) => {
    try {
      await updateMutation.mutateAsync({ id: chain.id, data });
      toast.success('Chain updated successfully');
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update chain';
      toast.error(message);
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
          <DialogTitle>Edit Chain</DialogTitle>
          <DialogDescription>
            Update the blockchain network configuration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Ethereum Mainnet"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="chainId">Chain ID</Label>
              <Input
                id="chainId"
                type="number"
                placeholder="1"
                {...register('chainId')}
              />
              {errors.chainId && (
                <p className="text-sm text-destructive">{errors.chainId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rpcUrl">RPC URL</Label>
              <Input
                id="rpcUrl"
                type="url"
                placeholder="https://mainnet.infura.io/v3/YOUR-PROJECT-ID"
                {...register('rpcUrl')}
              />
              {errors.rpcUrl && (
                <p className="text-sm text-destructive">{errors.rpcUrl.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockTime">Block Time (seconds)</Label>
              <Input
                id="blockTime"
                type="number"
                placeholder="12"
                {...register('blockTime')}
              />
              {errors.blockTime && (
                <p className="text-sm text-destructive">{errors.blockTime.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="enabled">Enabled</Label>
              <Select
                value={enabled ? 'true' : 'false'}
                onValueChange={(value) => setValue('enabled', value === 'true')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
              {errors.enabled && (
                <p className="text-sm text-destructive">{errors.enabled.message}</p>
              )}
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

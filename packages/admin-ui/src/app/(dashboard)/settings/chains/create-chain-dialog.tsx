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
import { useCreateChain } from '@/lib/hooks';

const createChainSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  chainId: z.coerce.number().int().positive('Chain ID must be a positive integer'),
  rpcUrl: z.string().url('Invalid URL format'),
  blockTime: z.coerce
    .number()
    .int()
    .min(1, 'Block time must be at least 1 second')
    .max(3600, 'Block time must be at most 3600 seconds')
    .optional()
    .default(12),
});

type CreateChainForm = z.infer<typeof createChainSchema>;

interface CreateChainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChainDialog({ open, onOpenChange }: CreateChainDialogProps) {
  const createMutation = useCreateChain();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateChainForm>({
    resolver: zodResolver(createChainSchema),
    defaultValues: {
      blockTime: 12,
    },
  });

  const onSubmit = async (data: CreateChainForm) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Chain created successfully');
      reset();
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create chain';
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
          <DialogTitle>Add Chain</DialogTitle>
          <DialogDescription>
            Add a new blockchain network to monitor for events.
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
              <p className="text-xs text-muted-foreground">
                Average time between blocks. Default is 12 seconds.
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

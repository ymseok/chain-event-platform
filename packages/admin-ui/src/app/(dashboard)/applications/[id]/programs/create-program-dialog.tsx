'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProgram, useChains } from '@/lib/hooks';

const createProgramSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  chainId: z.string().min(1, 'Chain is required'),
  contractAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  abi: z.string().min(1, 'ABI is required'),
});

type CreateProgramForm = z.infer<typeof createProgramSchema>;

interface CreateProgramDialogProps {
  appId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProgramDialog({
  appId,
  open,
  onOpenChange,
}: CreateProgramDialogProps) {
  const { data: chains } = useChains();
  const createMutation = useCreateProgram(appId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProgramForm>({
    resolver: zodResolver(createProgramSchema),
  });

  const [abiError, setAbiError] = useState<string | null>(null);

  const onSubmit = async (data: CreateProgramForm) => {
    setAbiError(null);

    let parsedAbi;
    try {
      parsedAbi = JSON.parse(data.abi);
    } catch (e) {
      setAbiError('Invalid JSON format');
      return;
    }

    if (!Array.isArray(parsedAbi)) {
      setAbiError('ABI must be an array');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: data.name,
        chainId: parseInt(data.chainId),
        contractAddress: data.contractAddress,
        abi: parsedAbi,
      });
      toast.success('Program created successfully');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create program');
    }
  };

  const handleClose = () => {
    reset();
    setAbiError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Program</DialogTitle>
          <DialogDescription>
            Add a smart contract to track its events. Events will be
            automatically extracted from the ABI.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="USDC Contract"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="chainId">Chain</Label>
                <Select
                  onValueChange={(value) => setValue('chainId', value)}
                  value={watch('chainId')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {chains?.map((chain) => (
                      <SelectItem key={chain.id} value={String(chain.id)}>
                        {chain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.chainId && (
                  <p className="text-sm text-destructive">
                    {errors.chainId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractAddress">Contract Address</Label>
              <Input
                id="contractAddress"
                placeholder="0x..."
                {...register('contractAddress')}
              />
              {errors.contractAddress && (
                <p className="text-sm text-destructive">
                  {errors.contractAddress.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="abi">ABI (JSON)</Label>
              <Textarea
                id="abi"
                placeholder="Paste contract ABI here..."
                className="min-h-[200px] font-mono text-sm"
                {...register('abi')}
              />
              {(errors.abi || abiError) && (
                <p className="text-sm text-destructive">
                  {errors.abi?.message || abiError}
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

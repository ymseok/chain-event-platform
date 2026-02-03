'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useChains, useCreateProgram } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractAbiFromFile = (content: string): unknown[] | null => {
    try {
      const parsed = JSON.parse(content);

      // If it's already an array, use it directly
      if (Array.isArray(parsed)) {
        return parsed;
      }

      // If it's an object with an 'abi' field that is an array, extract it
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.abi)) {
        return parsed.abi;
      }

      return null;
    } catch {
      return null;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const extractedAbi = extractAbiFromFile(content);

      if (extractedAbi) {
        setValue('abi', JSON.stringify(extractedAbi, null, 2), { shouldValidate: true, shouldDirty: true });
        setAbiError(null);
        toast.success('ABI extracted successfully');
      } else {
        setAbiError('Could not extract ABI. File must contain an ABI array or an object with an "abi" field.');
        toast.error('Failed to extract ABI from file');
      }
    };
    reader.onerror = () => {
      setAbiError('Failed to read file');
      toast.error('Failed to read file');
    };
    reader.readAsText(file);

    // Reset file input so the same file can be uploaded again
    event.target.value = '';
  };

  const onSubmit = async (data: CreateProgramForm) => {
    setAbiError(null);

    let parsedAbi;
    try {
      const parsed = JSON.parse(data.abi);

      // Support both formats:
      // 1. Direct ABI array: [...]
      // 2. Full artifact with abi field: { "abi": [...], "bytecode": "...", ... }
      if (Array.isArray(parsed)) {
        parsedAbi = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.abi)) {
        parsedAbi = parsed.abi;
      } else {
        setAbiError('Invalid ABI format. Provide an ABI array or an object with an "abi" field.');
        return;
      }
    } catch (e) {
      setAbiError('Invalid JSON format');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: data.name,
        chainId: parseInt(data.chainId),
        contractAddress: data.contractAddress,
        abi: JSON.stringify(parsedAbi),
      });
      toast.success('Program created successfully');
      reset();
      onOpenChange(false);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = axiosError.response?.data?.error?.message || 'Failed to create program';
      toast.error(errorMessage);
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
              <div className="flex items-center justify-between">
                <Label htmlFor="abi">ABI (JSON)</Label>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload ABI File
                  </Button>
                </div>
              </div>
              <Textarea
                id="abi"
                placeholder="Paste contract ABI here or upload a JSON file..."
                className="min-h-[200px] font-mono text-sm"
                value={watch('abi') || ''}
                onChange={(e) => setValue('abi', e.target.value, { shouldValidate: true })}
              />
              <p className="text-xs text-muted-foreground">
                Supports both plain ABI array and full contract artifact (with abi, bytecode, etc.). The ABI will be automatically extracted.
              </p>
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

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
import { useChains, useCreateProgram, useVerifyContract } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ContractVerificationResult } from '@/types';

const createProgramSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  chainId: z.string().min(1, 'Chain is required'),
  contractAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  abi: z.string().min(1, 'ABI is required'),
});

type CreateProgramForm = z.infer<typeof createProgramSchema>;

function VerificationResultBanner({
  result,
}: {
  result: ContractVerificationResult;
}) {
  const isSuccess =
    result.status === 'VERIFIED' || result.status === 'CONTRACT_EXISTS';
  const isError =
    result.status === 'NO_CONTRACT' || result.status === 'RPC_ERROR';
  const isWarning = result.status === 'BYTECODE_MISMATCH';

  const Icon = isSuccess ? CheckCircle2 : isError ? XCircle : AlertTriangle;

  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        isSuccess &&
          'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
        isError && 'border-destructive/20 bg-destructive/10 text-destructive',
        isWarning && 'border-amber-500/20 bg-amber-500/10 text-amber-500'
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p>{result.message}</p>
          {result.chainName && (
            <p className="text-xs opacity-80">Chain: {result.chainName}</p>
          )}
          {result.onChainBytecodeSize != null && (
            <p className="text-xs opacity-80">
              On-chain bytecode size: {result.onChainBytecodeSize} bytes
            </p>
          )}
          {result.warnings.length > 0 && (
            <div className="space-y-0.5">
              {result.warnings.map((warning, i) => (
                <p
                  key={i}
                  className="flex items-center gap-1 text-xs text-amber-500"
                >
                  <Info className="h-3 w-3 shrink-0" />
                  {warning}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const verifyMutation = useVerifyContract();

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
  const [verificationResult, setVerificationResult] =
    useState<ContractVerificationResult | null>(null);
  const [deployedBytecode, setDeployedBytecode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const watchedChainId = watch('chainId');
  const watchedAddress = watch('contractAddress');

  useEffect(() => {
    setVerificationResult(null);
  }, [watchedChainId, watchedAddress]);

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(watchedAddress || '');
  const canVerify = !!watchedChainId && isValidAddress;

  const handleVerify = useCallback(async () => {
    if (!canVerify) return;
    try {
      const result = await verifyMutation.mutateAsync({
        chainId: parseInt(watchedChainId),
        contractAddress: watchedAddress,
        ...(deployedBytecode && { deployedBytecode }),
      });
      setVerificationResult(result);
    } catch {
      setVerificationResult({
        status: 'RPC_ERROR',
        contractExists: false,
        bytecodeChecked: false,
        bytecodeMatch: null,
        onChainBytecodeSize: null,
        message: 'Failed to verify contract. Please try again.',
        chainName: '',
        warnings: [],
      });
    }
  }, [canVerify, watchedChainId, watchedAddress, deployedBytecode, verifyMutation]);

  const extractAbiFromFile = (content: string): { abi: unknown[]; deployedBytecode: string | null } | null => {
    try {
      const parsed = JSON.parse(content);
      let abi: unknown[] | null = null;
      let bytecode: string | null = null;

      if (Array.isArray(parsed)) {
        abi = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.abi)) {
        abi = parsed.abi;
        // Extract deployedBytecode from Hardhat/Foundry artifact
        const raw = parsed.deployedBytecode;
        if (typeof raw === 'string' && /^0x[a-fA-F0-9]+$/.test(raw)) {
          bytecode = raw;
        } else if (raw && typeof raw === 'object' && typeof raw.object === 'string' && /^0x[a-fA-F0-9]+$/.test(raw.object)) {
          bytecode = raw.object;
        }
      }

      return abi ? { abi, deployedBytecode: bytecode } : null;
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
      const extracted = extractAbiFromFile(content);

      if (extracted) {
        setValue('abi', JSON.stringify(extracted.abi, null, 2), { shouldValidate: true, shouldDirty: true });
        setDeployedBytecode(extracted.deployedBytecode);
        setVerificationResult(null);
        setAbiError(null);
        toast.success(
          extracted.deployedBytecode
            ? 'ABI and deployed bytecode extracted successfully'
            : 'ABI extracted successfully'
        );
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
    setVerificationResult(null);
    setDeployedBytecode(null);
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
              <div className="flex gap-2">
                <Input
                  id="contractAddress"
                  placeholder="0x..."
                  className="flex-1"
                  {...register('contractAddress')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0"
                  disabled={!canVerify || verifyMutation.isPending}
                  onClick={handleVerify}
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
              {errors.contractAddress && (
                <p className="text-sm text-destructive">
                  {errors.contractAddress.message}
                </p>
              )}
              {verificationResult && (
                <VerificationResultBanner result={verificationResult} />
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
                onChange={(e) => {
                  setValue('abi', e.target.value, { shouldValidate: true });
                  setDeployedBytecode(null);
                  setVerificationResult(null);
                }}
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

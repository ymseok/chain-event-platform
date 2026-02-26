'use client';

import { useState } from 'react';
import { Plus, Link2, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ConfirmDialog } from '@/components/common';
import { Switch } from '@/components/ui/switch';
import {
  useChains,
  useChainsAdmin,
  useDeleteChain,
  useCheckChainRpc,
  useUpdateChain,
} from '@/lib/hooks';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatDate, truncateMiddle } from '@/lib/utils';
import { CreateChainDialog } from './create-chain-dialog';
import { EditChainDialog } from './edit-chain-dialog';
import type { Chain } from '@/types';

export default function ChainsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [chainToEdit, setChainToEdit] = useState<Chain | null>(null);
  const [chainToDelete, setChainToDelete] = useState<Chain | null>(null);
  const [checkingRpcId, setCheckingRpcId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const user = useAuthStore((state) => state.user);
  const isRoot = user?.isRoot ?? false;

  const { data: adminChains, isLoading: isAdminLoading } = useChainsAdmin({ enabled: isRoot });
  const { data: publicChains, isLoading: isPublicLoading } = useChains({ enabled: !isRoot });
  const chains = isRoot ? adminChains : publicChains;
  const isLoading = isRoot ? isAdminLoading : isPublicLoading;
  const deleteMutation = useDeleteChain();
  const checkRpcMutation = useCheckChainRpc();
  const updateMutation = useUpdateChain();

  const handleDelete = async () => {
    if (!chainToDelete) return;
    try {
      await deleteMutation.mutateAsync(chainToDelete.id);
      toast.success('Chain deleted successfully');
      setChainToDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete chain';
      toast.error(message);
    }
  };

  const handleCheckRpc = async (chain: Chain) => {
    setCheckingRpcId(chain.id);
    try {
      const result = await checkRpcMutation.mutateAsync(chain.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Failed to check RPC connection');
    } finally {
      setCheckingRpcId(null);
    }
  };

  const handleToggleEnabled = async (chain: Chain) => {
    setTogglingId(chain.id);
    try {
      await updateMutation.mutateAsync({
        id: chain.id,
        data: { enabled: !chain.enabled },
      });
      toast.success(`Chain ${!chain.enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update chain';
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blockchain Networks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Blockchain Networks</CardTitle>
          <Button onClick={() => setIsCreateOpen(true)} disabled={!isRoot}>
            <Plus className="mr-2 h-4 w-4" />
            Add Chain
          </Button>
        </CardHeader>
        <CardContent>
          {!chains || chains.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No chains configured"
              description={
                isRoot
                  ? 'Add blockchain networks to enable event monitoring.'
                  : 'No blockchain networks configured. Contact a Root administrator to add chains.'
              }
              action={
                isRoot
                  ? {
                      label: 'Add Chain',
                      onClick: () => setIsCreateOpen(true),
                    }
                  : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chain</TableHead>
                  {isRoot && <TableHead>RPC URL</TableHead>}
                  {isRoot && <TableHead className="w-28">Block Time</TableHead>}
                  <TableHead className="w-24">Status</TableHead>
                  {isRoot && <TableHead className="w-32">Created</TableHead>}
                  {isRoot && <TableHead className="w-32"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chains.map((chain) => (
                  <TableRow key={chain.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{chain.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Chain ID: {chain.chainId}
                        </p>
                      </div>
                    </TableCell>
                    {isRoot && (
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {truncateMiddle(chain.rpcUrl, 25, 10)}
                        </code>
                      </TableCell>
                    )}
                    {isRoot && <TableCell>{chain.blockTime}s</TableCell>}
                    <TableCell>
                      <Switch
                        checked={chain.enabled}
                        disabled={!isRoot || togglingId === chain.id}
                        onCheckedChange={() => handleToggleEnabled(chain)}
                      />
                    </TableCell>
                    {isRoot && (
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(chain.createdAt)}
                      </TableCell>
                    )}
                    {isRoot && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCheckRpc(chain)}
                            disabled={checkingRpcId === chain.id}
                            title="Check RPC connection"
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${
                                checkingRpcId === chain.id ? 'animate-spin' : ''
                              }`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setChainToEdit(chain)}
                            title="Edit chain"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setChainToDelete(chain)}
                            title="Delete chain"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateChainDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {chainToEdit && (
        <EditChainDialog
          chain={chainToEdit}
          open={!!chainToEdit}
          onOpenChange={(open) => !open && setChainToEdit(null)}
        />
      )}

      <ConfirmDialog
        open={!!chainToDelete}
        onOpenChange={(open) => !open && setChainToDelete(null)}
        title="Delete Chain"
        description={`Are you sure you want to delete "${chainToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

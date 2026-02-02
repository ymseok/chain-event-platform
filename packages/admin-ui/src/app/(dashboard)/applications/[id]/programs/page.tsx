'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Code2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DataTable,
  StatusBadge,
  EmptyState,
  ConfirmDialog,
} from '@/components/common';
import { usePrograms, useDeleteProgram } from '@/lib/hooks';
import { formatDate, truncateAddress } from '@/lib/utils';
import { CreateProgramDialog } from './create-program-dialog';
import type { Program } from '@/types';
import type { Column } from '@/components/common/data-table';

export default function ProgramsPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);

  const { data, isLoading } = usePrograms(appId, page, 20);
  const deleteMutation = useDeleteProgram();

  const handleDelete = async () => {
    if (!programToDelete) return;
    try {
      await deleteMutation.mutateAsync(programToDelete);
      toast.success('Program deleted');
      setProgramToDelete(null);
    } catch (error) {
      toast.error('Failed to delete program');
    }
  };

  const columns: Column<Program>[] = [
    {
      header: 'Name',
      cell: (program) => (
        <div>
          <p className="font-medium">{program.name}</p>
          <p className="text-sm text-muted-foreground">
            {truncateAddress(program.contractAddress)}
          </p>
        </div>
      ),
    },
    {
      header: 'Chain',
      cell: (program) => program.chain?.name || `Chain ${program.chainId}`,
    },
    {
      header: 'Events',
      cell: (program) => program._count?.events ?? 0,
      className: 'w-24',
    },
    {
      header: 'Status',
      cell: (program) => <StatusBadge status={program.status} />,
      className: 'w-24',
    },
    {
      header: 'Created',
      cell: (program) => formatDate(program.createdAt),
      className: 'w-32',
    },
    {
      header: '',
      cell: (program) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setProgramToDelete(program.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
      className: 'w-12',
    },
  ];

  const handleRowClick = (program: Program) => {
    router.push(`/programs/${program.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Program
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!isLoading && data?.data.length === 0 ? (
            <EmptyState
              icon={Code2}
              title="No programs"
              description="Add a smart contract program to start tracking its events."
              action={{
                label: 'Add Program',
                onClick: () => setIsCreateOpen(true),
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={data?.data || []}
              isLoading={isLoading}
              pagination={data?.meta}
              onPageChange={setPage}
              onRowClick={handleRowClick}
            />
          )}
        </CardContent>
      </Card>

      <CreateProgramDialog
        appId={appId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <ConfirmDialog
        open={!!programToDelete}
        onOpenChange={(open) => !open && setProgramToDelete(null)}
        title="Delete Program"
        description="Are you sure you want to delete this program? All associated events and subscriptions will also be deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, AppWindow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  PageHeader,
  DataTable,
  EmptyState,
} from '@/components/common';
import { CreateApplicationDialog } from '@/components/applications';
import { useApplications } from '@/lib/hooks';
import { useAppStore } from '@/lib/stores/app-store';
import { formatDate } from '@/lib/utils';
import type { Application } from '@/types';
import type { Column } from '@/components/common/data-table';

export default function ApplicationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { setCurrentApp } = useAppStore();

  const { data, isLoading } = useApplications(page, 20);

  const columns: Column<Application>[] = [
    {
      header: 'Name',
      cell: (app) => (
        <div>
          <p className="font-medium">{app.name}</p>
          <p className="text-sm text-muted-foreground">
            {app.description || 'No description'}
          </p>
        </div>
      ),
    },
    {
      header: 'Created',
      cell: (app) => formatDate(app.createdAt),
      className: 'w-32',
    },
  ];

  const handleRowClick = (app: Application) => {
    setCurrentApp(app);
    router.push(`/applications/${app.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Manage your applications and their configurations"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {!isLoading && data?.data.length === 0 ? (
            <EmptyState
              icon={AppWindow}
              title="No applications"
              description="Get started by creating your first application to track blockchain events."
              action={{
                label: 'Create Application',
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

      <CreateApplicationDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}

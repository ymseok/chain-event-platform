'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Code2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  PageHeader,
  StatusBadge,
  DataTable,
  CodeBlock,
  EmptyState,
} from '@/components/common';
import { useProgram, useEvents } from '@/lib/hooks';
import { formatDate, truncateAddress } from '@/lib/utils';
import type { Event } from '@/types';
import type { Column } from '@/components/common/data-table';

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;

  const [page, setPage] = useState(1);

  const { data: program, isLoading: programLoading } = useProgram(programId);
  const { data: events, isLoading: eventsLoading } = useEvents(programId, page, 20);

  if (programLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-semibold">Program not found</h2>
        <Button variant="link" onClick={() => router.back()} className="mt-4">
          Go back
        </Button>
      </div>
    );
  }

  const columns: Column<Event>[] = [
    {
      header: 'Name',
      cell: (event) => <span className="font-medium">{event.name}</span>,
    },
    {
      header: 'Signature',
      cell: (event) => (
        <code className="text-sm bg-muted px-2 py-1 rounded">
          {truncateAddress(event.signature, 8)}
        </code>
      ),
    },
    {
      header: 'Parameters',
      cell: (event) => (
        <code className="text-sm bg-muted px-2 py-1 rounded">
          {event.parameters}
        </code>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{program.name}</h1>
            <StatusBadge status={program.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{program.chain?.name || `Chain ${program.chainId}`}</span>
            <span className="flex items-center gap-1">
              <code>{truncateAddress(program.contractAddress)}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  window.open(
                    `https://etherscan.io/address/${program.contractAddress}`,
                    '_blank'
                  )
                }
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Contract Address</p>
              <code className="text-sm">{program.contractAddress}</code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chain</p>
              <p>{program.chain?.name || `Chain ID: ${program.chainId}`}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{formatDate(program.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ABI</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={JSON.stringify(program.abi, null, 2)}
              className="max-h-64 overflow-auto"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          {!eventsLoading && (!events?.data || events.data.length === 0) ? (
            <EmptyState
              icon={Code2}
              title="No events found"
              description="No events were extracted from the ABI. Make sure the ABI includes event definitions."
            />
          ) : (
            <DataTable
              columns={columns}
              data={events?.data || []}
              isLoading={eventsLoading}
              pagination={events?.meta}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

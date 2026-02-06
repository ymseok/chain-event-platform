import apiClient from './client';
import type { IngestorInstancesResponse, RebalanceResponse } from '@/types';

export async function getIngestorInstances(): Promise<IngestorInstancesResponse> {
  const response = await apiClient.get<IngestorInstancesResponse>(
    '/ingestor/instances',
  );
  return response.data;
}

export async function rebalanceIngestors(): Promise<RebalanceResponse> {
  const response = await apiClient.post<RebalanceResponse>(
    '/ingestor/rebalance',
  );
  return response.data;
}

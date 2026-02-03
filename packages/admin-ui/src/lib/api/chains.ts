import apiClient from './client';
import type { Chain, CreateChainDto, UpdateChainDto, RpcCheckResult } from '@/types';

export async function getChains(): Promise<Chain[]> {
  const response = await apiClient.get<Chain[]>('/chains');
  return response.data;
}

export async function getChain(id: number): Promise<Chain> {
  const response = await apiClient.get<Chain>(`/chains/${id}`);
  return response.data;
}

export async function getChainsAdmin(): Promise<Chain[]> {
  const response = await apiClient.get<Chain[]>('/chains/admin');
  return response.data;
}

export async function getChainAdmin(id: number): Promise<Chain> {
  const response = await apiClient.get<Chain>(`/chains/admin/${id}`);
  return response.data;
}

export async function createChain(data: CreateChainDto): Promise<Chain> {
  const response = await apiClient.post<Chain>('/chains', data);
  return response.data;
}

export async function updateChain(id: number, data: UpdateChainDto): Promise<Chain> {
  const response = await apiClient.patch<Chain>(`/chains/${id}`, data);
  return response.data;
}

export async function deleteChain(id: number): Promise<void> {
  await apiClient.delete(`/chains/${id}`);
}

export async function checkChainRpc(id: number): Promise<RpcCheckResult> {
  const response = await apiClient.post<RpcCheckResult>(`/chains/${id}/check-rpc`);
  return response.data;
}

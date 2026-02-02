import apiClient from './client';
import type { Chain } from '@/types';

export async function getChains(): Promise<Chain[]> {
  const response = await apiClient.get<Chain[]>('/chains');
  return response.data;
}

export async function getChain(id: number): Promise<Chain> {
  const response = await apiClient.get<Chain>(`/chains/${id}`);
  return response.data;
}

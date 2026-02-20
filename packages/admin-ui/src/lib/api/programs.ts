import apiClient from './client';
import type {
  Program,
  PaginatedResponse,
  CreateProgramDto,
  UpdateProgramDto,
  VerifyContractDto,
  ContractVerificationResult,
} from '@/types';

export async function getPrograms(
  appId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Program>> {
  const response = await apiClient.get<PaginatedResponse<Program>>(
    `/applications/${appId}/programs`,
    {
      params: { page, limit },
    }
  );
  return response.data;
}

export async function getProgram(id: string): Promise<Program> {
  const response = await apiClient.get<Program>(`/programs/${id}`);
  return response.data;
}

export async function createProgram(
  appId: string,
  data: CreateProgramDto
): Promise<Program> {
  const response = await apiClient.post<Program>(
    `/applications/${appId}/programs`,
    data
  );
  return response.data;
}

export async function updateProgram(
  id: string,
  data: UpdateProgramDto
): Promise<Program> {
  const response = await apiClient.patch<Program>(`/programs/${id}`, data);
  return response.data;
}

export async function deleteProgram(id: string): Promise<void> {
  await apiClient.delete(`/programs/${id}`);
}

export async function verifyContract(
  data: VerifyContractDto
): Promise<ContractVerificationResult> {
  const response = await apiClient.post<ContractVerificationResult>(
    '/programs/verify-contract',
    data
  );
  return response.data;
}

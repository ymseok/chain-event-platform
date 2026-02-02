import apiClient from './client';
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '@/types';

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return response.data;
}

export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
  return response.data;
}

export async function refreshToken(token: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/refresh', {
    refreshToken: token,
  });
  return response.data;
}

export async function getProfile(): Promise<User> {
  const response = await apiClient.get<User>('/auth/profile');
  return response.data;
}

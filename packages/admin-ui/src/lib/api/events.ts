import apiClient from './client';
import type { Event, PaginatedResponse } from '@/types';

export async function getEvents(
  programId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Event>> {
  const response = await apiClient.get<PaginatedResponse<Event>>(
    `/programs/${programId}/events`,
    {
      params: { page, limit },
    }
  );
  return response.data;
}

export async function getEvent(id: string): Promise<Event> {
  const response = await apiClient.get<Event>(`/events/${id}`);
  return response.data;
}

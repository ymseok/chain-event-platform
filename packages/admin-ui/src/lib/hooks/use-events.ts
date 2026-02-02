import { useQuery } from '@tanstack/react-query';
import { getEvents, getEvent } from '@/lib/api/events';

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (programId: string, page: number, limit: number) =>
    [...eventKeys.lists(), programId, { page, limit }] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
};

export function useEvents(programId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: eventKeys.list(programId, page, limit),
    queryFn: () => getEvents(programId, page, limit),
    enabled: !!programId,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEvent(id),
    enabled: !!id,
  });
}

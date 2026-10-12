import { useQuery } from '@tanstack/react-query';
import { fetchWorkerJson } from '../lib/workerClient';

/**
 * Thin wrapper around useQuery for read-only worker resources — new data
 * points (game score, dev step, future studio-computed fields, ...) become a
 * query-key + path pair here instead of a bespoke hook each time.
 */
export function useWorkerResource<T>(
  queryKey: readonly unknown[],
  path: string,
  enabled: boolean,
  options?: { refetchInterval?: number }
) {
  return useQuery({
    queryKey,
    queryFn: () => fetchWorkerJson<T>(path),
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
    refetchInterval: options?.refetchInterval,
  });
}

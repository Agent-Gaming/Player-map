/**
 * Central query-key factory for worker-backed data. Add one entry per new
 * resource so cache keys stay collision-free and invalidation stays explicit.
 */
export const workerKeys = {
  gamePublicInfo: (atomId: string) => ['gamePublicInfo', atomId] as const,
  campaigns: (atomId: string) => ['campaigns', atomId] as const,
};

export function workerUrl(path: string): string {
  // Discord Activity: CSP blocks direct requests to the worker's own origin.
  // Route through the host's same-origin /.proxy/api/player/* passthrough
  // instead (see playermap-discord's unified-server.ts) — same pattern as
  // config/graphql.ts's discordsays.com branch.
  if (typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com')) {
    return `${window.location.origin}/.proxy${path}`;
  }
  const base = import.meta.env.VITE_WORKER_URL ?? '';
  return `${base}${path}`;
}

export async function fetchWorkerJson<T>(path: string): Promise<T> {
  const response = await fetch(workerUrl(path));
  if (!response.ok) {
    throw new Error(`Worker request failed: ${path} (${response.status})`);
  }
  return response.json();
}

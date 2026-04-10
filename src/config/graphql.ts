import { configureClient } from "@0xintuition/graphql";

const getApiUrl = (): string => {
  if (import.meta.env.DEV) return '/graphql';
  // Discord Activity: route via CDN proxy to avoid CSP restrictions
  if (typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com')) {
    return `${window.location.origin}/.proxy/graphql`;
  }
  return import.meta.env.VITE_INTUITION_GRAPHQL_URL ?? "https://mainnet.intuition.sh/v1/graphql";
};

export default function initGraphql() {
  configureClient({ apiUrl: getApiUrl() });
}

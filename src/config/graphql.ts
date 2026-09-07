import { configureClient } from "@0xintuition/graphql";

const getApiUrl = (): string => {
  if (import.meta.env.DEV) return '/graphql';
  // Discord Activity: route via CDN proxy to avoid CSP restrictions
  if (typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com')) {
    return `${window.location.origin}/.proxy/graphql`;
  }
  // mainnet.intuition.sh is the correct read endpoint. Atom creation pins via
  // Pinata directly (see useAtomCreation.ts) instead of the SDK's pinThing
  // GraphQL mutation, which this endpoint (and every intuition.sh endpoint)
  // rejects — it has no mutation_root, mutations are gated behind a separate
  // pin.intuition.systems service requiring an Intuition-issued API key.
  return import.meta.env.VITE_INTUITION_GRAPHQL_URL ?? "https://mainnet.intuition.sh/v1/graphql";
};

export default function initGraphql() {
  configureClient({ apiUrl: getApiUrl() });
}

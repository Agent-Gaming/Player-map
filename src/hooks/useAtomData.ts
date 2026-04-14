import { createServerClient, configureClient } from '@0xintuition/graphql';

// Enum pour les différents réseaux disponibles
export enum Network {
  MAINNET = 'mainnet',
  TESTNET = 'testnet'
}

// URLs des API GraphQL
// Discord intercepte cette URL et la redirige vers /.proxy/graphql (CSP oblige)
// En dev standalone: proxy.agent-bossfighters.com accepte CORS depuis toutes origines
export const API_URLS = {
  [Network.MAINNET]: import.meta.env.VITE_INTUITION_GRAPHQL_URL ?? 'https://proxy.agent-bossfighters.com/graphql',
  [Network.TESTNET]: '/graphql'
};

// Fonction pour créer un client avec le réseau approprié
export const createClient = (network: Network = Network.MAINNET): ReturnType<typeof createServerClient> => {
  configureClient({ apiUrl: API_URLS[network] });
  return createServerClient({});
};
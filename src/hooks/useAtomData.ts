import { createServerClient, configureClient } from '@0xintuition/graphql';

// Enum pour les différents réseaux disponibles
export enum Network {
  MAINNET = 'mainnet',
  TESTNET = 'testnet'
}

// URLs des API GraphQL
// En développement, utilise le proxy pour éviter les erreurs CORS
export const API_URLS = {
  [Network.MAINNET]: import.meta.env.VITE_INTUITION_GRAPHQL_URL ?? '/graphql',
  [Network.TESTNET]: '/graphql'
};

// Fonction pour créer un client avec le réseau approprié
export const createClient = (network: Network = Network.MAINNET): ReturnType<typeof createServerClient> => {
  configureClient({ apiUrl: API_URLS[network] });
  return createServerClient({});
};
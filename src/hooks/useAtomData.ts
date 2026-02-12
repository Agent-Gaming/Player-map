import { createServerClient, API_URL_DEV } from '@0xintuition/graphql';

// Enum pour les différents réseaux disponibles
export enum Network {
  MAINNET = 'mainnet',
  TESTNET = 'testnet'
}

// URLs des API GraphQL
// En développement, utilise le proxy pour éviter les erreurs CORS
const isDev = import.meta.env.DEV;
export const API_URLS = {
  [Network.MAINNET]: isDev 
    ? '/graphql' 
    : (import.meta.env.VITE_INTUITION_GRAPHQL_URL ?? "https://mainnet.intuition.sh/v1/graphql"),
  [Network.TESTNET]: isDev
    ? '/graphql'
    : "https://testnet.intuition.sh/v1/graphql"
};

// Fonction pour créer un client avec le réseau approprié
export const createClient = (network: Network = Network.MAINNET): ReturnType<typeof createServerClient> => {
  const options = {
    url: API_URLS[network],
    headers: {
      'Content-Type': 'application/json',
      // Add an API key header if available
      // 'x-api-key': process.env.INTUITION_API_KEY || ''
    },
    token: undefined // Assuming token is optional and can be undefined
  };
  return createServerClient(options);
}; 
import { configureClient } from "@0xintuition/graphql";

// option: lis l'URL depuis un env/flag
// En développement, utilise le proxy pour éviter les erreurs CORS
const isDev = import.meta.env.DEV;
const API_URL = isDev
  ? '/graphql'
  : (import.meta.env.VITE_INTUITION_GRAPHQL_URL ?? "https://mainnet.intuition.sh/v1/graphql");

// A) soit on exporte une fonction à appeler
export default function initGraphql() {
  configureClient({ apiUrl: API_URL });
}

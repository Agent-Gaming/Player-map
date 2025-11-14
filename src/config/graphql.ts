import { configureClient } from "@0xintuition/graphql";

// option: lis l'URL depuis un env/flag
const API_URL =
  import.meta.env.VITE_INTUITION_GRAPHQL_URL ??
  "https://mainnet.intuition.sh/v1/graphql";

// A) soit on exporte une fonction à appeler
export default function initGraphql() {
  configureClient({ apiUrl: API_URL });
}

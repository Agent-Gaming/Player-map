import { Network, API_URLS } from '../hooks/useAtomData';

// Campaign tab only: net shares (deposits minus redemptions) a wallet moved
// on a set of vaults strictly within a time window — unlike `positions`
// (used everywhere else in this app), this reflects activity during the
// window only, not the account's current all-time vault balance. Mirrors
// the signed-aggregation logic the worker already uses for official
// campaign results (computeCampaignVoteTotals), just scoped per-wallet
// instead of across every account.
export async function fetchWindowedNetPositions(
  termIds: string[],
  walletAddress: string,
  window: { start: string; end: string },
  network: Network = Network.MAINNET,
): Promise<Map<string, bigint>> {
  const net = new Map<string, bigint>();
  if (termIds.length === 0 || !walletAddress) return net;

  try {
    const apiUrl = API_URLS[network];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetWindowedNetPositions($termIds: [String!]!, $accountId: String!, $start: timestamptz!, $end: timestamptz!) {
            deposits(where: {
              sender_id: { _ilike: $accountId }
              term_id: { _in: $termIds }
              created_at: { _gte: $start, _lte: $end }
            }) {
              term_id
              shares
            }
            redemptions(where: {
              sender_id: { _ilike: $accountId }
              term_id: { _in: $termIds }
              created_at: { _gte: $start, _lte: $end }
            }) {
              term_id
              shares
            }
          }
        `,
        variables: {
          termIds,
          accountId: walletAddress.toLowerCase(),
          start: window.start,
          end: window.end,
        },
      }),
    });

    if (!response.ok) throw new Error(`GraphQL request failed with status ${response.status}`);
    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0]?.message || 'GraphQL error');

    for (const d of result.data?.deposits ?? []) {
      net.set(d.term_id, (net.get(d.term_id) ?? 0n) + BigInt(d.shares));
    }
    for (const r of result.data?.redemptions ?? []) {
      net.set(r.term_id, (net.get(r.term_id) ?? 0n) - BigInt(r.shares));
    }
    return net;
  } catch (error) {
    console.error('[fetchWindowedPositions] error fetching windowed net positions:', error);
    return net;
  }
}

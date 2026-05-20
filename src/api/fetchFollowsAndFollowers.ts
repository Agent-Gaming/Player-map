import { Network, API_URLS } from '../hooks/useAtomData';
import { PREDICATES, ATOMS } from '../utils/constants';

// Triple structure: (I, follow, accountAtomId)
// following = walletAddress has positions in (I, follow, *) triples with shares > 0
// followers = any wallet has positions in (I, follow, playerAccountAtomId) triple with shares > 0

export const fetchFollowsAndFollowers = async (
  _predicateId: string, // kept for backward compat, ignored — PREDICATES.FOLLOWS used directly
  walletAddress: string,
  network: Network = Network.MAINNET,
  playerAccountAtomId?: string,
) => {
  try {
    const apiUrl = API_URLS[network];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetFollowsAndFollowers(
            $iAtom: String!
            $predicate: String!
            $wallet: String!
            $playerAtomId: String!
          ) {
            follows: positions(where: {
              account_id: { _ilike: $wallet }
              shares: { _gt: "0" }
              vault: { term: { triple: {
                subject_id: { _eq: $iAtom }
                predicate_id: { _eq: $predicate }
              }}}
            }) {
              vault {
                term {
                  triple {
                    object_id
                    object { term_id label image }
                  }
                }
              }
            }
            followers: positions(where: {
              shares: { _gt: "0" }
              vault: { term: { triple: {
                subject_id: { _eq: $iAtom }
                predicate_id: { _eq: $predicate }
                object_id: { _eq: $playerAtomId }
              }}}
            }) {
              account_id
            }
          }
        `,
        variables: {
          iAtom: ATOMS.I,
          predicate: PREDICATES.FOLLOWS,
          wallet: walletAddress.toLowerCase(),
          playerAtomId: playerAccountAtomId ?? '',
        },
      }),
    });

    const data = await response.json();

    const follows = (data.data?.follows || []).map((p: any) => {
      const obj = p.vault?.term?.triple?.object;
      return {
        object_id: p.vault?.term?.triple?.object_id,
        object: obj ?? null,
      };
    });

    const followers = (data.data?.followers || []).map((p: any) => ({
      account_id: p.account_id,
    }));

    return { follows, followers };
  } catch (error) {
    console.error('Error fetching follows and followers:', error);
    return { follows: [], followers: [] };
  }
};

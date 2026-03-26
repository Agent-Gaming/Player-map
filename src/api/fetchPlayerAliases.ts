import { Network, API_URLS } from '../hooks/useAtomData';
import { toHex } from 'viem';

/**
 * Fetches the term_id of the account atom for a wallet address.
 * Tries two storage formats:
 *   - raw bytes: data == walletAddress (new format, rawHex=true in createStringAtom)
 *   - toHex() : data == toHex(walletAddress) (old UTF-8 encoded format)
 * Returns the lowest term_id match, or null if not found.
 */
export const fetchAccountAtom = async (
  walletAddress: string,
  network: Network = Network.MAINNET
): Promise<string | null> => {
  try {
    const apiUrl = API_URLS[network];
    const address = walletAddress.toLowerCase();
    const encoded = toHex(address); // old format: UTF-8 encoding of address string
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetAccountAtom($address: String!, $encoded: String!) {
            atoms(
              where: { _or: [
                { data: { _ilike: $address } }
                { data: { _ilike: $encoded } }
              ]}
              order_by: { term_id: asc }
              limit: 1
            ) {
              term_id
            }
          }
        `,
        variables: { address, encoded },
      }),
    });

    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL errors (fetchAccountAtom):', data.errors);
      return null;
    }

    const atoms = data.data?.atoms || [];
    return atoms.length > 0 ? atoms[0].term_id : null;
  } catch (error) {
    console.error('Error fetching account atom:', error);
    return null;
  }
};

/**
 * Fetches the term_id of the player's first (earliest) atom by their wallet address.
 * The player registration atom is always the first atom created by that address.
 * Returns null if the player has no atom (not yet registered).
 */
export const fetchPlayerAtomByAddress = async (
  walletAddress: string,
  network: Network = Network.MAINNET
): Promise<string | null> => {
  try {
    const apiUrl = API_URLS[network];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetPlayerAtom($address: String!) {
            atoms(
              where: { creator_id: { _eq: $address } }
              order_by: { term_id: asc }
              limit: 1
            ) {
              term_id
            }
          }
        `,
        variables: { address: walletAddress.toLowerCase() },
      }),
    });

    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL errors (fetchPlayerAtomByAddress):', data.errors);
      return null;
    }

    const atoms = data.data?.atoms || [];
    return atoms.length > 0 ? atoms[0].term_id : null;
  } catch (error) {
    console.error('Error fetching player atom:', error);
    return null;
  }
};

export interface RawAliasTriple {
  tripleId: string
  pseudo: string
  atomId: string
  userPosition: bigint
}

/**
 * Fetches all [has alias] triples for a player atom, including the user's own position
 * in each triple's vault. Returns only triples where we can determine the user's position
 * (position may be 0 if user has no stake in that alias).
 */
export const fetchAliasTriplesWithPosition = async (
  playerAtomId: string,
  walletAddress: string,
  predicateId: string,
  network: Network = Network.MAINNET
): Promise<RawAliasTriple[]> => {
  try {
    const apiUrl = API_URLS[network];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetAliasTriples($playerAtomId: String!, $predicateId: String!, $userAddress: String!) {
            triples(where: {
              subject_id: { _eq: $playerAtomId },
              predicate_id: { _eq: $predicateId }
            }) {
              term_id
              object {
                term_id
                data
              }
              term {
                positions(where: { account_id: { _eq: $userAddress } }) {
                  shares
                }
              }
            }
          }
        `,
        variables: {
          playerAtomId,
          predicateId,
          userAddress: walletAddress.toLowerCase(),
        },
      }),
    });

    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL errors (fetchAliasTriplesWithPosition):', data.errors);
      return [];
    }

    const triples = data.data?.triples || [];
    return triples.map((t: any): RawAliasTriple => ({
      tripleId: t.term_id,
      pseudo: t.object?.data ?? '',
      atomId: t.object?.term_id ?? '',
      // positions array may be empty if user has no stake; default to 0n
      userPosition: t.term?.positions?.[0]?.shares
        ? BigInt(t.term.positions[0].shares)
        : 0n,
    }));
  } catch (error) {
    console.error('Error fetching alias triples:', error);
    return [];
  }
};

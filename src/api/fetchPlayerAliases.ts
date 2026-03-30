import { Network, API_URLS } from '../hooks/useAtomData';
import { toHex, getAddress } from 'viem';
import { isIpfsUrl, ipfsToHttpUrl } from '../utils/pinata';

/**
 * Fetches the term_id of the account atom for a wallet address.
 * Only looks for SDK format: data == toHex(getAddress(walletAddress))
 * (createAtomFromEthereumAccount — the canonical format).
 * Legacy formats (raw bytes, UTF-8 string) are intentionally ignored.
 * Returns the term_id if found, or null.
 */
export const fetchAccountAtom = async (
  walletAddress: string,
  network: Network = Network.MAINNET
): Promise<string | null> => {
  try {
    const apiUrl = API_URLS[network];
    const sdkEncoded = toHex(getAddress(walletAddress)); // SDK format: toHex(checksummed address)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetAccountAtom($sdkEncoded: String!) {
            atoms(
              where: { data: { _ilike: $sdkEncoded } }
              order_by: { term_id: asc }
              limit: 1
            ) {
              term_id
            }
          }
        `,
        variables: { sdkEncoded },
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
  image?: string
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
                image
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
    return triples.map((t: any): RawAliasTriple => {
      const rawImage: string | undefined = t.object?.image ?? undefined;
      const image = rawImage
        ? (isIpfsUrl(rawImage) ? ipfsToHttpUrl(rawImage) : rawImage)
        : undefined;
      return {
        tripleId: t.term_id,
        pseudo: t.object?.data ?? '',
        atomId: t.object?.term_id ?? '',
        image,
        userPosition: t.term?.positions?.[0]?.shares
          ? BigInt(t.term.positions[0].shares)
          : 0n,
      };
    });
  } catch (error) {
    console.error('Error fetching alias triples:', error);
    return [];
  }
};

/**
 * Queries whether an account atom has an [accepted] triple pointing to any consent atom.
 * Used at form load to skip consent steps for users who already accepted terms v1.0.
 * Returns exists: false (not called) when accountAtomId is undefined (new user).
 */
export const fetchAccountConsent = async (
  accountAtomId: string,
  acceptedPredicateId: string,
  network: Network = Network.MAINNET
): Promise<{ exists: boolean; consentAtomId?: string }> => {
  try {
    const apiUrl = API_URLS[network];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetAccountConsent($subjectId: String!, $predicateId: String!) {
            triples(
              where: {
                subject_id: { _eq: $subjectId }
                predicate_id: { _eq: $predicateId }
              }
              limit: 1
            ) {
              term_id
              object {
                term_id
              }
            }
          }
        `,
        variables: {
          subjectId: accountAtomId,
          predicateId: acceptedPredicateId,
        },
      }),
    });

    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL errors (fetchAccountConsent):', data.errors);
      return { exists: false };
    }

    const triples = data.data?.triples || [];
    if (triples.length === 0) return { exists: false };
    return {
      exists: true,
      consentAtomId: triples[0].object?.term_id,
    };
  } catch (error) {
    console.error('Error fetching account consent:', error);
    return { exists: false };
  }
};

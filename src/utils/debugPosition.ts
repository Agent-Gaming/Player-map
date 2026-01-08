import { Network, API_URLS } from "../hooks/useAtomData";

/**
 * Function to directly check a user's position on a specific triple
 * This can be helpful for debugging position-related issues
 */
export const checkTriplePosition = async (
  walletAddress: string,
  tripleId: string | number,
  network: Network = Network.MAINNET
): Promise<{
  hasPosition: boolean;
  isFor: boolean | null;
  result: any;
}> => {
  if (!walletAddress) {
    throw new Error("Wallet address is required");
  }

  try {
    const apiUrl = API_URLS[network];

    // Direct query to check position
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetTripleUserPosition($tripleId: String!) {
            triple(term_id: $tripleId) {
              term_id
              counter_term_id
            }
          }
        `,
        variables: {
          tripleId: String(tripleId)
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const tripleInfo = result.data?.triple;
    if (!tripleInfo || !tripleInfo.term_id) {
      return {
        hasPosition: false,
        isFor: null,
        result: result.data
      };
    }

    // Fetch term positions separately
    const termId = tripleInfo.term_id;
    const counterTermId = tripleInfo.counter_term_id;

    const [termResponse, counterTermResponse] = await Promise.all([
      termId ? fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetTermPositions($termId: String!, $walletAddress: String!) {
              positions(where: { term_id: { _eq: $termId }, account_id: { _ilike: $walletAddress } }) {
                id
              }
            }
          `,
          variables: {
            termId,
            walletAddress: walletAddress.toLowerCase()
          },
        }),
      }) : Promise.resolve(null),
      counterTermId ? fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetCounterTermPositions($termId: String!, $walletAddress: String!) {
              positions(where: { term_id: { _eq: $termId }, account_id: { _ilike: $walletAddress } }) {
                id
              }
            }
          `,
          variables: {
            termId: counterTermId,
            walletAddress: walletAddress.toLowerCase()
          },
        }),
      }) : Promise.resolve(null),
    ]);

    const termData = termResponse ? await termResponse.json() : { data: { positions: [] } };
    const counterTermData = counterTermResponse ? await counterTermResponse.json() : { data: { positions: [] } };

    const hasTermPosition = (termData.data?.positions?.length || 0) > 0;
    const hasCounterTermPosition = (counterTermData.data?.positions?.length || 0) > 0;

    const foundPosition = hasTermPosition || hasCounterTermPosition;
    const isFor = foundPosition ? hasTermPosition : null;

    return {
      hasPosition: foundPosition,
      isFor,
      result: {
        triple: tripleInfo,
        term: { positions: termData.data?.positions || [] },
        counter_term: { positions: counterTermData.data?.positions || [] }
      }
    };
  } catch (err) {
    console.error("Error checking triple position:", err);
    throw err;
  }
}; 
import { Network, API_URLS } from '../hooks/useAtomData';

// Fetch follows and followers
export const fetchFollowsAndFollowers = async (
  predicateId: string,
  accountId: string,
  network: Network = Network.MAINNET
) => {
  try {
    const apiUrl = API_URLS[network];

    // Pour le moment, on garde l'ID hardcodé comme dans playermap-graph
    const userAtomId = "0x4b5ec64b82fae56c71a469fc902df2096b0dc7c930dd61032e817d583575fe47";

    if (!userAtomId) {
      console.warn('⚠️ Aucun atom trouvé pour cette adresse');
      return { follows: [], followers: [] };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetFollowsAndFollowers($predicateId: String!, $userAtomId: String!) {
            follows: triples(
              where: {
                _and: [
                  { predicate_id: { _eq: $predicateId } },
                  { subject_id: { _eq: $userAtomId } }
                ]
              }
            ) {
              term_id
              object_id
            }
            followers: triples(
              where: {
                _and: [
                  { predicate_id: { _eq: $predicateId } },
                  { object_id: { _eq: $userAtomId } }
                ]
              }
            ) {
              term_id
              subject_id
            }
          }
        `,
        variables: { predicateId, userAtomId }
      })
    });

    const data = await response.json();
    
    // Fetch atom details for objects (follows) and subjects (followers)
    const objectIds = [...new Set((data.data?.follows || []).map((f: any) => f.object_id).filter(Boolean))];
    const subjectIds = [...new Set((data.data?.followers || []).map((f: any) => f.subject_id).filter(Boolean))];
    const allAtomIds = [...new Set([...objectIds, ...subjectIds])];

    let atomsMap = new Map();
    if (allAtomIds.length > 0) {
      const atomsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetAtoms($termIds: [String!]!) {
              atoms(where: { term_id: { _in: $termIds } }) {
                term_id
                label
                image
                creator_id
              }
            }
          `,
          variables: { termIds: allAtomIds }
        })
      });

      const atomsData = await atomsResponse.json();
      atomsMap = new Map(
        (atomsData.data?.atoms || []).map((atom: any) => [atom.term_id, atom])
      );
    }

    return {
      follows: (data.data?.follows || []).map((f: any) => ({
        ...f,
        object: atomsMap.get(f.object_id) || { term_id: f.object_id, label: '', image: null, creator_id: '' }
      })),
      followers: (data.data?.followers || []).map((f: any) => ({
        ...f,
        subject: atomsMap.get(f.subject_id) || { term_id: f.subject_id, label: '', image: null }
      }))
    };
  } catch (error) {
    console.error('Error fetching follows and followers:', error);
    return { follows: [], followers: [] };
  }
};





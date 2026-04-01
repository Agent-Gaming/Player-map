import { Network, API_URLS } from '../hooks/useAtomData';
import { apiCache } from '../utils/apiCache';
import { filterTripleImages } from '../config/atomFiltering';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchAllWithPagination = async (
  apiUrl: string,
  query: string,
  variables: any,
  dataPath: string,
  batchSize: number = 50
): Promise<any[]> => {
  const allResults: any[] = [];
  let offset = 0;
  let hasMore = true;
  const maxBatches = 5;
  let batchCount = 0;

  while (hasMore && batchCount < maxBatches) {
    batchCount++;
    if (batchCount > 1) await delay(200);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { ...variables, limit: batchSize, offset } })
    });

    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors[0]?.message || 'GraphQL error');
    }

    const results = data.data?.[dataPath] || [];
    if (results.length === 0) {
      hasMore = false;
    } else {
      allResults.push(...results);
      if (results.length < batchSize) hasMore = false;
      else offset += batchSize;
    }
  }

  return allResults;
};

export const fetchActivityHistory = async (
  accountId: string,
  network: Network = Network.MAINNET
) => {
  const cacheKey = `activity_${accountId}_${network}`;

  return apiCache.withCache(
    cacheKey,
    { accountId, network },
    async () => {
      try {
        const apiUrl = API_URLS[network];

        // Step 1: deposits + redemptions in parallel
        const [deposits, redemptions] = await Promise.all([
          fetchAllWithPagination(apiUrl, `
            query GetDeposits($accountId: String!, $limit: Int!, $offset: Int!) {
              deposits(limit: $limit, offset: $offset, where: { sender_id: { _eq: $accountId } }) {
                id shares assets_after_fees created_at vault_type term_id
              }
            }
          `, { accountId }, 'deposits'),
          fetchAllWithPagination(apiUrl, `
            query GetRedemptions($accountId: String!, $limit: Int!, $offset: Int!) {
              redemptions(limit: $limit, offset: $offset, where: { sender_id: { _eq: $accountId } }) {
                id shares assets created_at vault_type term_id
              }
            }
          `, { accountId }, 'redemptions'),
        ]);

        const allTermIds = [...new Set([
          ...deposits.map((d: any) => d.term_id),
          ...redemptions.map((r: any) => r.term_id),
        ].filter(Boolean))];

        if (allTermIds.length === 0) return [];

        // Step 2: single query — terms with atom + triple (+ subject_term) embedded
        const termsResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetTermsWithDetails($termIds: [String!]!) {
                terms(where: { id: { _in: $termIds } }) {
                  id
                  total_market_cap
                  total_assets
                  atom_id
                  triple_id
                  positions_aggregate(where: { shares: { _gt: 0 } }) {
                    aggregate { count }
                  }
                  atom {
                    term_id
                    label
                    image
                  }
                  triple {
                    term_id
                    subject_id
                    predicate_id
                    object_id
                    counter_term_id
                    subject { term_id label image }
                    predicate { term_id label }
                    object { term_id label image }
                    subject_term {
                      id
                      triple {
                        subject { label term_id }
                        predicate { label }
                        object { label image term_id }
                      }
                    }
                    counter_term {
                      id
                      positions_aggregate(where: { shares: { _gt: 0 } }) {
                        aggregate { count }
                      }
                    }
                  }
                }
              }
            `,
            variables: { termIds: allTermIds },
          }),
        });

        const termsData = await termsResponse.json();
        if (termsData.errors) {
          console.error('[fetchActivityHistory] terms query errors:', termsData.errors);
          return [];
        }

        const termsMap = new Map(
          (termsData.data?.terms || []).map((t: any) => {
            const enriched = t.triple ? { ...t, triple: filterTripleImages(t.triple) } : t;
            return [t.id, enriched];
          })
        );

        // Step 3: enrich activities
        const enrichActivity = (activity: any) => {
          const term = termsMap.get(activity.term_id);
          if (!term) return { ...activity, term: null };

          const triple = term.triple ?? null;
          const atom = term.atom ?? null;

          const enrichedTerm: any = {
            id: term.id,
            total_market_cap: term.total_market_cap,
            total_assets: term.total_assets,
            positions_aggregate: term.positions_aggregate ?? null,
            atom: atom ? { term_id: atom.term_id, label: atom.label, image: atom.image } : null,
            triple: null,
          };

          if (triple) {
            // Resolve subject: if subject.label is empty and subject_term.triple exists, attach _innerTriple
            const subjectLabel = triple.subject?.label;
            const innerTriple = (!subjectLabel && triple.subject_term?.triple)
              ? triple.subject_term.triple
              : null;

            enrichedTerm.triple = {
              term_id: triple.term_id,
              subject_id: triple.subject_id,
              predicate_id: triple.predicate_id,
              object_id: triple.object_id,
              subject: triple.subject || { label: '' },
              predicate: triple.predicate || { label: '' },
              object: triple.object || { label: '' },
              _innerTriple: innerTriple,
              counter_term: triple.counter_term ? {
                id: triple.counter_term.id,
                positions_aggregate: triple.counter_term.positions_aggregate ?? null,
              } : null,
            };
          }

          return { ...activity, term: enrichedTerm };
        };

        const activities = [
          ...deposits.map((d: any) => enrichActivity({ ...d, activity_type: 'deposit' })),
          ...redemptions.map((r: any) => enrichActivity({ ...r, activity_type: 'redemption' })),
        ];

        return activities.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } catch (error) {
        console.error('Error fetching activity history:', error);
        return [];
      }
    },
    2 * 60 * 1000
  );
};

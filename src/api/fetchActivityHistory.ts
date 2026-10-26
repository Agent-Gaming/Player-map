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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// An unbounded `where: { id: { _in: [...] } }` query (no limit/offset)
// silently caps at the subgraph's default page size instead of erroring —
// confirmed live: 124 requested term_ids returned only 100 rows, the
// missing 24 silently becoming "term: null" -> "Unknown" in the UI, for no
// data-related reason at all. A limit/offset loop doesn't help an _in
// filter (each page would just re-apply the same 100-row cap); chunking
// the id list into parallel requests does.
const CHUNK_SIZE = 50;
async function fetchChunkedByIds(
  apiUrl: string,
  query: string,
  idVariableName: string,
  ids: string[],
  dataPath: string
): Promise<any[]> {
  const results = await Promise.all(
    chunk(ids, CHUNK_SIZE).map(async (idsChunk) => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { [idVariableName]: idsChunk } }),
      });
      const data = await response.json();
      if (data.errors) {
        console.error('[fetchActivityHistory] chunked query errors:', data.errors);
        return [];
      }
      return data.data?.[dataPath] || [];
    })
  );
  return results.flat();
}

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

        // Step 2: terms with atom + triple (+ subject_term) embedded, chunked
        // (see fetchChunkedByIds — an unbounded _in query silently truncates).
        const termsRows = await fetchChunkedByIds(
          apiUrl,
          `
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
                  positions_aggregate(where: { shares: { _gt: 0 } }) {
                    aggregate { count }
                  }
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
          'termIds',
          allTermIds,
          'terms'
        );

        const termsMap = new Map(
          termsRows.map((t: any) => {
            const enriched = t.triple ? { ...t, triple: filterTripleImages(t.triple) } : t;
            return [t.id, enriched];
          })
        );

        // Step 2.5: reverse-lookup original triples for counter-triple term IDs
        const counterTermIds = [...new Set([
          ...deposits.filter((d: any) => d.vault_type === 'CounterTriple').map((d: any) => d.term_id),
          ...redemptions.filter((r: any) => r.vault_type === 'CounterTriple').map((r: any) => r.term_id),
        ].filter(Boolean))];

        const originalTripleMap = new Map<string, any>();
        if (counterTermIds.length > 0) {
          const originalTriples = await fetchChunkedByIds(
            apiUrl,
            `
              query OriginalTriples($ids: [String!]!) {
                triples(where: { counter_term_id: { _in: $ids } }) {
                  term_id counter_term_id subject_id predicate_id object_id
                  positions_aggregate(where: { shares: { _gt: 0 } }) { aggregate { count } }
                  subject { term_id label image }
                  predicate { term_id label }
                  object { term_id label image }
                  subject_term {
                    id
                    triple { subject { label term_id } predicate { label } object { label image term_id } }
                  }
                  counter_term {
                    id
                    positions_aggregate(where: { shares: { _gt: 0 } }) { aggregate { count } }
                  }
                }
              }
            `,
            'ids',
            counterTermIds,
            'triples'
          );
          for (const t of originalTriples) {
            if (t.counter_term_id) originalTripleMap.set(t.counter_term_id, t);
          }
        }

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
              // The triple's own positions_aggregate is always the FOR-side
              // count, regardless of whether this activity's own term_id is
              // the FOR or the counter (AGAINST) vault — confirmed live:
              // querying `triple { positions_aggregate }` from either side's
              // term returns the identical for-count. Without this, an
              // AGAINST deposit's row had no way to show the FOR count at
              // all (it only ever carried the counter vault's own count).
              positions_aggregate: triple.positions_aggregate ?? null,
              counter_term: triple.counter_term ? {
                id: triple.counter_term.id,
                positions_aggregate: triple.counter_term.positions_aggregate ?? null,
              } : null,
            };
          }

          // For counter-triple activities, attach original triple for display
          if (activity.vault_type === 'CounterTriple' && !enrichedTerm.triple) {
            const orig = originalTripleMap.get(activity.term_id);
            if (orig) {
              const inner = (!orig.subject?.label && orig.subject_term?.triple) ? orig.subject_term.triple : null;
              enrichedTerm._originalTriple = {
                term_id: orig.term_id,
                subject_id: orig.subject_id,
                predicate_id: orig.predicate_id,
                object_id: orig.object_id,
                subject: orig.subject || { label: '' },
                predicate: orig.predicate || { label: '' },
                object: orig.object || { label: '' },
                _innerTriple: inner,
                positions_aggregate: orig.positions_aggregate ?? null,
                counter_term: orig.counter_term ? {
                  id: orig.counter_term.id,
                  positions_aggregate: orig.counter_term.positions_aggregate ?? null,
                } : null,
              };
            }
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

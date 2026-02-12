import { Network, API_URLS } from '../hooks/useAtomData';
import { apiCache } from '../utils/apiCache';

// Helper pour ajouter un délai entre les requêtes (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch Active Positions by Account (only positions with shares > 0)
// Récupère toutes les positions par batch de 100 pour éviter la limite
export const fetchPositions = async (
  accountId: string,
  network: Network = Network.MAINNET
) => {
  // Utiliser le cache (TTL de 2 minutes pour les positions)
  const cacheKey = `positions_${accountId}_${network}`;
  
  return apiCache.withCache(
    cacheKey,
    { accountId, network },
    async () => {
      try {
        const apiUrl = API_URLS[network];
        const allPositions: any[] = [];
        const batchSize = 50; // Réduit de 100 à 50 pour limiter la charge
        let offset = 0;
        let hasMore = true;
        const maxBatches = 10; // Limite à 10 batches (500 positions max)
        let batchCount = 0;

    while (hasMore && batchCount < maxBatches) {
      batchCount++;
      
      // Ajouter un délai entre les batches pour éviter le rate limiting
      if (batchCount > 1) {
        await delay(200); // 200ms entre chaque batch
      }
      
      // Étape 1: Récupérer les positions avec seulement term_id (sans relation term)
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query GetActivePositions($accountId: String!, $limit: Int!, $offset: Int!) {
  positions(where: { account_id: { _eq: $accountId }, shares: { _gt: 0 } }, limit: $limit, offset: $offset) {
    id
    shares
    curve_id
    account_id
    term_id
    vault {
      deposits {
        vault_type
      }
      redemptions {
        vault_type
      }
    }
    account {
      id
      label
      image
    }
  }
}`,
          variables: { accountId, limit: batchSize, offset }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(data.errors[0]?.message || 'GraphQL error');
      }

      const positions = data.data?.positions || [];
      
      if (positions.length === 0) {
        hasMore = false;
      } else {
        // Étape 2: Récupérer les détails des terms pour ces positions
        const termIds = [...new Set(positions.map((p: any) => p.term_id).filter(Boolean))];
        
        // Enrichir les positions avec les détails des terms
        if (termIds.length > 0) {
          await delay(100); // Petit délai avant la requête des terms
          const termsResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                query GetTerms($termIds: [String!]!) {
                  terms(where: { id: { _in: $termIds } }) {
                    id
                    total_market_cap
                    total_assets
                    atom_id
                    triple_id
                  }
                }
              `,
              variables: { termIds }
            })
          });

          const termsData = await termsResponse.json();
          
          if (!termsData.errors && termsData.data?.terms) {
            const terms = termsData.data.terms;
            const atomIds = [...new Set(terms.map((t: any) => t.atom_id).filter(Boolean))];
            const tripleIds = [...new Set(terms.map((t: any) => t.triple_id).filter(Boolean))];

            // Petit délai avant les requêtes parallèles
            await delay(100);
            
            // Fetch atoms and triples separately
            const [atomsResponse, triplesResponse] = await Promise.all([
              atomIds.length > 0 ? fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: `
                    query GetAtoms($atomIds: [String!]!) {
                      atoms(where: { term_id: { _in: $atomIds } }) {
                        term_id
                        label
                        image
                      }
                    }
                  `,
                  variables: { atomIds }
                })
              }) : Promise.resolve(null),
              tripleIds.length > 0 ? fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: `
                    query GetTriples($tripleIds: [String!]!) {
                      triples(where: { term_id: { _in: $tripleIds } }) {
                        term_id
                        subject_id
                        predicate_id
                        object_id
                        counter_term_id
                      }
                    }
                  `,
                  variables: { tripleIds }
                })
              }) : Promise.resolve(null),
            ]);

            const atomsData = atomsResponse ? await atomsResponse.json() : { data: { atoms: [] } };
            const triplesData = triplesResponse ? await triplesResponse.json() : { data: { triples: [] } };

            const atomsMap = new Map(
              (atomsData.data?.atoms || []).map((atom: any) => [atom.term_id, atom])
            );
            const triplesMap = new Map(
              (triplesData.data?.triples || []).map((triple: any) => [triple.term_id, triple])
            );

            // Fetch subject, predicate, object details for triples
            const allTripleAtomIds = [...new Set(
              (triplesData.data?.triples || []).flatMap((t: any) => [t.subject_id, t.predicate_id, t.object_id]).filter(Boolean)
            )];

            let tripleAtomsMap = new Map();
            if (allTripleAtomIds.length > 0) {
              await delay(100); // Délai avant la requête des atoms de triples
              const tripleAtomsResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: `
                    query GetTripleAtoms($atomIds: [String!]!) {
                      atoms(where: { term_id: { _in: $atomIds } }) {
                        term_id
                        label
                      }
                    }
                  `,
                  variables: { atomIds: allTripleAtomIds }
                })
              });

              const tripleAtomsData = await tripleAtomsResponse.json();
              if (!tripleAtomsData.errors) {
                tripleAtomsMap = new Map(
                  (tripleAtomsData.data?.atoms || []).map((atom: any) => [atom.term_id, atom])
                );
              }
            }

            // Fetch counter_terms for triples
            const counterTermIds = [...new Set(
              (triplesData.data?.triples || []).map((t: any) => t.counter_term_id).filter(Boolean)
            )];

            let counterTermsMap = new Map();
            if (counterTermIds.length > 0) {
              await delay(100); // Délai avant la requête des counter terms
              const counterTermsResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: `
                    query GetCounterTerms($termIds: [String!]!) {
                      terms(where: { id: { _in: $termIds } }) {
                        id
                        total_market_cap
                        total_assets
                      }
                    }
                  `,
                  variables: { termIds: counterTermIds }
                })
              });

              const counterTermsData = await counterTermsResponse.json();
              if (!counterTermsData.errors) {
                counterTermsMap = new Map(
                  (counterTermsData.data?.terms || []).map((term: any) => [term.id, term])
                );
              }
            }

            // Build terms map with enriched data
            const termsMap = new Map(
              terms.map((term: any) => [
                term.id,
                {
                  ...term,
                  atom: atomsMap.get(term.atom_id) || null,
                  triple: triplesMap.get(term.triple_id) ? {
                    ...triplesMap.get(term.triple_id),
                    subject: tripleAtomsMap.get(triplesMap.get(term.triple_id)?.subject_id) || { term_id: triplesMap.get(term.triple_id)?.subject_id, label: '' },
                    predicate: tripleAtomsMap.get(triplesMap.get(term.triple_id)?.predicate_id) || { term_id: triplesMap.get(term.triple_id)?.predicate_id, label: '' },
                    object: tripleAtomsMap.get(triplesMap.get(term.triple_id)?.object_id) || { term_id: triplesMap.get(term.triple_id)?.object_id, label: '' },
                    counter_term: counterTermsMap.get(triplesMap.get(term.triple_id)?.counter_term_id) || null
                  } : null,
                }
              ])
            );

            // Enrich positions with term details
            const enrichedPositions = positions.map((pos: any) => ({
              ...pos,
              term: termsMap.get(pos.term_id) || null,
            }));

            allPositions.push(...enrichedPositions);
          } else {
            // Si erreur, ajouter les positions sans détails
            allPositions.push(...positions);
          }
        } else {
          allPositions.push(...positions);
        }
        
        // Si on a reçu moins de batchSize résultats, c'est la dernière page
        if (positions.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }
      }
      
      // Sécurité : éviter les boucles infinies
      if (offset > 5000) { // Limite à 5000 positions
        console.warn('Limite de positions atteinte (5000)');
        hasMore = false;
      }
    }

    return allPositions;
      } catch (error) {
        console.error('Error fetching active positions:', error);
        return [];
      }
    },
    2 * 60 * 1000 // TTL de 2 minutes
  );
};

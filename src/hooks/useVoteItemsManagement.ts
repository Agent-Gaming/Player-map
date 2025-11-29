import { useState, useEffect } from "react";
import { VoteItem, VoteDirection } from "../types/vote";
import { DefaultPlayerMapConstants } from "../types/PlayerMapConfig";
import { Network, API_URLS } from "./useAtomData";
import { useFetchTripleDetails, TripleDetails } from "./useFetchTripleDetails";

interface UseVoteItemsManagementProps {
  network?: Network;
  walletAddress?: string;
  onError?: (message: string) => void;
  constants: DefaultPlayerMapConstants; // Constantes injectées
}

export const useVoteItemsManagement = ({
  network = Network.MAINNET,
  walletAddress = "",
  onError,
  constants
}: UseVoteItemsManagementProps) => {
  const [voteItems, setVoteItems] = useState<VoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Utiliser les constantes passées en paramètre
  const { PREDEFINED_CLAIM_IDS } = constants;
  const [totalUnits, setTotalUnits] = useState(0);
  const [userPositions, setUserPositions] = useState<Record<string, VoteDirection>>({});
  const [hasLoadedTripleDetails, setHasLoadedTripleDetails] = useState(false); // Flag pour éviter les re-loads multiples

  // Use our hook for fetching triple details
  const { fetchTripleDetails, isLoading: isFetchingTriple } = useFetchTripleDetails({
    network,
    onError
  });

  // Fetch user's existing positions - OPTIMISÉ avec batch fetch pour tous les PREDEFINED_CLAIM_IDS
  const [userPositionsData, setUserPositionsData] = useState<any>(null);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(true);

  // Batch fetch des positions utilisateur pour tous les PREDEFINED_CLAIM_IDS (une seule requête)
  useEffect(() => {
    const fetchUserPositionsBatch = async () => {
      if (!walletAddress || !PREDEFINED_CLAIM_IDS || PREDEFINED_CLAIM_IDS.length === 0) {
        setLoadingPositions(false);
        return;
      }

      try {
        setLoadingPositions(true);
        const apiUrl = API_URLS[network];
        
        // Fetch triples first
        const query = `
          query BatchUserPositions($tripleIds: [String!]!) {
            triples(where: { term_id: { _in: $tripleIds } }) {
              term_id
              counter_term_id
            }
          }
        `;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            variables: {
              tripleIds: PREDEFINED_CLAIM_IDS.map(id => id.toString())
            }
          })
        });

        if (!response.ok) {
          throw new Error(`GraphQL request failed with status ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
          console.error("GraphQL Errors:", result.errors);
          throw new Error(result.errors[0].message);
        }

        // Fetch term positions separately
        const triples = result.data?.triples || [];
        const termIds = [...new Set(triples.map((t: any) => t.term_id).filter(Boolean))];
        const counterTermIds = [...new Set(triples.map((t: any) => t.counter_term_id).filter(Boolean))];
        const allTermIds = [...new Set([...termIds, ...counterTermIds])];

        let termPositionsMap = new Map();
        if (allTermIds.length > 0) {
          const positionsQuery = `
            query GetTermPositions($termIds: [String!]!, $walletAddress: String!) {
              positions(where: { term_id: { _in: $termIds }, account_id: { _ilike: $walletAddress }, shares: { _gt: 0 } }) {
                term_id
              }
            }
          `;

          const positionsResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: positionsQuery,
              variables: {
                termIds: allTermIds,
                walletAddress: walletAddress.toLowerCase()
              }
            })
          });

          const positionsResult = await positionsResponse.json();
          if (!positionsResult.errors) {
            const positionsByTermId = new Map<string, number>();
            (positionsResult.data?.positions || []).forEach((pos: any) => {
              const count = positionsByTermId.get(pos.term_id) || 0;
              positionsByTermId.set(pos.term_id, count + 1);
            });
            positionsByTermId.forEach((count, termId) => {
              termPositionsMap.set(termId, {
                term_id: termId,
                positions_aggregate: {
                  aggregate: { count }
                }
              });
            });
          }
        }

        // Traiter les résultats
        const positionsData: any = { triples: [] };
        
        triples.forEach((triple: any) => {
          const termPositions = termPositionsMap.get(triple.term_id);
          const counterTermPositions = termPositionsMap.get(triple.counter_term_id);
          
          const hasTermPositions = (termPositions?.positions_aggregate?.aggregate?.count || 0) > 0;
          const hasCounterTermPositions = (counterTermPositions?.positions_aggregate?.aggregate?.count || 0) > 0;
          
          positionsData.triples.push({
            term_id: triple.term_id,
            id: triple.term_id,
            hasTermPosition: hasTermPositions,
            hasCounterTermPosition: hasCounterTermPositions,
            term: termPositions,
            counter_term: counterTermPositions
          });
        });

        setUserPositionsData(positionsData);
      } catch (err) {
        console.error("Erreur lors de la récupération des positions utilisateur:", err);
        setUserPositionsData(null);
      } finally {
        setLoadingPositions(false);
      }
    };

    fetchUserPositionsBatch();
  }, [walletAddress, PREDEFINED_CLAIM_IDS.join(','), network]);

  // Process user positions data when it arrives
  useEffect(() => {
    if (userPositionsData && !loadingPositions && walletAddress) {
      const positions: Record<string, VoteDirection> = {};

      // Méthode 1: Vérifier si les positions sont dans le format attendu
      if (userPositionsData.positions && Array.isArray(userPositionsData.positions)) {
        userPositionsData.positions.forEach((position: any) => {
          if (!position.triple_id) return;
          const tripleId = position.triple_id;
          // Si la position a une propriété is_for ou similar pour indiquer la direction
          if (position.is_for !== undefined) {
            const direction = position.is_for ? VoteDirection.For : VoteDirection.Against;
            positions[String(tripleId)] = direction;
          } else if (position.term_id && position.counter_term_id) {
            // Si la position a des term_id qui peuvent indiquer la direction
            // Logique à déterminer en fonction de la structure exacte
          }
        });
      }

      // Méthode 2: Rechercher dans le format triples avec positions imbriquées (format batch optimisé)
      if (userPositionsData.triples && Array.isArray(userPositionsData.triples)) {
        userPositionsData.triples.forEach((triple: any) => {
          // Utiliser term_id (venant du batch) ou id (fallback pour compatibilité)
          const tripleId = triple.term_id || triple.id;
          if (!tripleId) {
            return;
          }

          // Utiliser la logique de useCheckSpecificTriplePosition : vérifier hasTermPosition et hasCounterTermPosition
          // qui viennent directement de la requête batch optimisée
          if (triple.hasTermPosition) {
            positions[String(tripleId)] = VoteDirection.For;
          } else if (triple.hasCounterTermPosition) {
            positions[String(tripleId)] = VoteDirection.Against;
          }

          // Fallback pour compatibilité avec ancien format (si les données viennent d'ailleurs)
          if (!triple.hasTermPosition && !triple.hasCounterTermPosition) {
            // Vérifier dans les positions imbriquées si disponibles
            const termPositions = triple.term?.positions || [];
            const counterTermPositions = triple.counter_term?.positions || [];
            
            const userTermPosition = termPositions.find((position: any) => {
              return position.account?.id?.toLowerCase() === walletAddress.toLowerCase();
            });
            
            const userCounterTermPosition = counterTermPositions.find((position: any) => {
              return position.account?.id?.toLowerCase() === walletAddress.toLowerCase();
            });
            
            if (userTermPosition) {
              positions[String(tripleId)] = VoteDirection.For;
            } else if (userCounterTermPosition) {
              positions[String(tripleId)] = VoteDirection.Against;
            }
          }
        });
      }

      // Méthode 3: Vérifier également dans des structures alternatives
      if (userPositionsData.position_triples && Array.isArray(userPositionsData.position_triples)) {
        userPositionsData.position_triples.forEach((item: any) => {
          if (!item.triple_id && !item.triple?.id) return;

          const tripleId = item.triple_id || item.triple?.id;

          if (item.is_for !== undefined) {
            positions[String(tripleId)] = item.is_for ? VoteDirection.For : VoteDirection.Against;
          } else if (item.term_id && item.triple?.term_id === item.term_id) {
            positions[String(tripleId)] = VoteDirection.For;
          } else if (item.term_id && item.triple?.counter_term_id === item.term_id) {
            positions[String(tripleId)] = VoteDirection.Against;
          }
        });
      }

      setUserPositions(positions);

      // Update existing vote items with user position information (si déjà chargés)
      setVoteItems(prevItems => {
        if (prevItems.length === 0) return prevItems; // Si pas encore chargés, ne pas les mettre à jour
        
        return prevItems.map(item => {
          // Essayer plusieurs formats d'ID pour correspondance : term_id (plus fiable) ou id brut
          const normalizedItemId = item.term_id || String(item.id);
          const positionDirection = positions[normalizedItemId] || 
                                   positions[String(item.id)] || 
                                   VoteDirection.None;
          const hasPosition = positionDirection !== VoteDirection.None;
          return {
            ...item,
            userHasPosition: hasPosition,
            userPositionDirection: positionDirection
          };
        });
      });

      // Appeler loadTripleDetails directement ici avec les positions mises à jour
      // pour éviter le problème de timing entre les useEffect
      if (!hasLoadedTripleDetails) {
        loadTripleDetails(positions).then(() => {
          setHasLoadedTripleDetails(true);
        }).catch((error) => {
          console.error("Error in loadTripleDetails:", error);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPositionsData, loadingPositions, walletAddress, hasLoadedTripleDetails]); // hasLoadedTripleDetails dans les deps pour éviter double appel

  // Update total units when voteItems change
  useEffect(() => {
    const total = voteItems.reduce((sum, item) => sum + item.units, 0);
    setTotalUnits(total);
  }, [voteItems]);

  // Batch fetch function - créée localement pour ne pas modifier les hooks
  const fetchTriplesDetailsBatch = async (tripleIds: string[]): Promise<Map<string, TripleDetails | null>> => {
    if (tripleIds.length === 0) {
      return new Map<string, TripleDetails | null>();
    }

    try {
      const apiUrl = API_URLS[network];
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
          query BatchTriples($tripleIds: [String!]!) {
            triples(where: { term_id: { _in: $tripleIds } }) {
              term_id
              subject_id
              predicate_id
              object_id
              counter_term_id
            }
          }
        `,
          variables: { tripleIds: tripleIds.map(id => id.toString()) },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const triples = result.data?.triples || [];
      
      // Fetch atoms details
      const allAtomIds = [...new Set(
        triples.flatMap((t: any) => [t.subject_id, t.predicate_id, t.object_id]).filter(Boolean)
      )];
      
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
                }
              }
            `,
            variables: { termIds: allAtomIds }
          })
        });
        
        const atomsData = await atomsResponse.json();
        if (!atomsData.errors) {
          atomsMap = new Map(
            (atomsData.data?.atoms || []).map((atom: any) => [atom.term_id, atom])
          );
        }
      }

      // Fetch terms details
      const allTermIds: string[] = [...new Set(
        triples.flatMap((t: any) => [t.term_id, t.counter_term_id]).filter(Boolean) as string[]
      )];
      
      let termsMap = new Map();
      if (allTermIds.length > 0) {
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
                }
              }
            `,
            variables: { termIds: allTermIds }
          })
        });
        
        const termsData = await termsResponse.json();
        if (!termsData.errors) {
          termsMap = new Map(
            (termsData.data?.terms || []).map((term: any) => [term.id, term])
          );
        }
      }

      // Fetch positions count for all terms in one batch query
      let positionsCountMap = new Map<string, number>();
      if (allTermIds.length > 0) {
        const positionsResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetPositionsCount($termIds: [String!]!) {
                positions_aggregate(where: { term_id: { _in: $termIds }, shares: { _gt: 0 } }) {
                  aggregate {
                    count
                  }
                }
              }
            `,
            variables: { termIds: allTermIds }
          })
        });

        const positionsData = await positionsResponse.json();
        if (!positionsData.errors && positionsData.data?.positions_aggregate) {
          // Note: positions_aggregate retourne un seul résultat pour tous les termIds
          // Il faudrait faire une requête par term_id pour avoir le détail
          // Pour l'instant, on fait une requête séparée par term_id
          const positionPromises = allTermIds.map(async (termId: string): Promise<{ termId: string; count: number }> => {
            const posResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `
                  query GetPositionsCountForTerm($termId: String!) {
                    positions_aggregate(where: { term_id: { _eq: $termId }, shares: { _gt: 0 } }) {
                      aggregate {
                        count
                      }
                    }
                  }
                `,
                variables: { termId }
              })
            });
            const posData = await posResponse.json();
            return {
              termId,
              count: posData.data?.positions_aggregate?.aggregate?.count || 0
            };
          });

          const positionResults = await Promise.all(positionPromises);
          positionResults.forEach((result) => {
            positionsCountMap.set(result.termId, result.count);
          });
        }
      }

      const results = new Map<string, TripleDetails | null>();
      for (const triple of triples) {
        const termDetails = termsMap.get(triple.term_id);
        const counterTermDetails = termsMap.get(triple.counter_term_id);

        const termPositionCount = positionsCountMap.get(triple.term_id) || 0;
        const counterTermPositionCount = positionsCountMap.get(triple.counter_term_id) || 0;

        results.set(triple.term_id, {
          id: triple.term_id,
          subject: atomsMap.get(triple.subject_id) || { term_id: triple.subject_id, label: '' },
          predicate: atomsMap.get(triple.predicate_id) || { term_id: triple.predicate_id, label: '' },
          object: atomsMap.get(triple.object_id) || { term_id: triple.object_id, label: '' },
          term_id: triple.term_id,
          counter_term_id: triple.counter_term_id,
          term_position_count: termPositionCount,
          counter_term_position_count: counterTermPositionCount
        });
      }

      // Mark missing triples as null
      tripleIds.forEach(id => {
        if (!results.has(id)) {
          results.set(id, null);
        }
      });

      return results;
    } catch (error) {
      const results = new Map<string, TripleDetails | null>();
      tripleIds.forEach(id => {
        results.set(id, null);
      });
      if (onError) {
        onError(`Error fetching batch triple details: ${error instanceof Error ? error.message : String(error)}`);
      }
      return results;
    }
  };

  // Function to load triple details from the blockchain - OPTIMISÉ avec batch fetch
  const loadTripleDetails = async (currentUserPositions?: Record<string, VoteDirection>) => {
    setIsLoading(true);

    try {
      // ÉTAPE 1: Fetch tous les détails en une seule requête batch (au lieu de 29 requêtes individuelles)
      const triplesDetailsMap = await fetchTriplesDetailsBatch(PREDEFINED_CLAIM_IDS);

      // Utiliser currentUserPositions si fourni, sinon utiliser le state userPositions
      const positionsToUse = currentUserPositions || userPositions;

      // ÉTAPE 2: Transformer les résultats en VoteItems
      const loadedItems: VoteItem[] = PREDEFINED_CLAIM_IDS.map((id) => {
        const details = triplesDetailsMap.get(id);

        if (!details) {
          return {
            id: BigInt(id),
            subject: `Claim ${id}`,
            predicate: "is",
            object: "Unknown",
            units: 0,
            direction: VoteDirection.None,
            userHasPosition: false,
            userPositionDirection: VoteDirection.None,
          } as VoteItem;
        }

        // Check if user has a position on this triple
        // Normaliser les IDs pour correspondance : utiliser term_id du details (plus fiable)
        const normalizedId = details.term_id || String(id);
        const userPositionDirection = positionsToUse[normalizedId] || 
                                     positionsToUse[String(id)] || 
                                     VoteDirection.None;

        // Debug pour tous les triples avec positions
        if (userPositionDirection !== VoteDirection.None) {
          console.log(`[loadTripleDetails] Triple ${normalizedId} a une position:`, userPositionDirection);
        }
        
        // Debug pour voir tous les IDs disponibles dans positionsToUse
        if (normalizedId === "0x27191de92fe0308355319ec8f2359e5ce85123bd243bf7ffa6eb8028347b3eab") {
          console.log(`[loadTripleDetails] Triple recherché: ${normalizedId}`);
          console.log(`[loadTripleDetails] positionsToUse keys:`, Object.keys(positionsToUse));
          console.log(`[loadTripleDetails] Trouvé dans positionsToUse:`, positionsToUse[normalizedId]);
        }

        return {
          id: BigInt(details.id),
          subject: details.subject?.label || `Subject ${id}`,
          predicate: details.predicate?.label || "is",
          object: details.object?.label || `Object ${id}`,
          units: 0,
          direction: VoteDirection.None,
          term_id: details.term_id,
          term_position_count: details.term_position_count || 0,
          counter_term_id: details.counter_term_id,
          counter_term_position_count: details.counter_term_position_count || 0,
          userHasPosition: userPositionDirection !== VoteDirection.None,
          userPositionDirection,
        } as VoteItem;
      });

      const allFailed = loadedItems.every(item => item.object === "Unknown");
      if (allFailed && onError) {
        onError("Error: Failed to fetch triple details. Please check your network connection or try again later.");
      }

      setVoteItems(loadedItems);
    } catch (error) {
      if (onError) {
        onError("Error: Failed to fetch triple details");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to change units and direction for a claim
  const handleChangeUnits = (id: bigint, direction: VoteDirection, units: number) => {
    // Vérifier d'abord si le vote est autorisé avec la fonction isVoteDirectionAllowed
    if (direction !== VoteDirection.None) {
      const allowed = isVoteDirectionAllowed(id, direction);
      if (!allowed) {
        // Récupérer l'item pour obtenir la direction de la position existante
        const item = voteItems.find(item => item.id === id);
        if (item && item.userHasPosition && item.userPositionDirection !== VoteDirection.None) {
          if (onError) {
            onError(`Cannot vote ${direction === VoteDirection.For ? "for" : "against"} this claim as you already have an ${item.userPositionDirection === VoteDirection.For ? "affirmative" : "opposing"} position on it.`);
          }
          return; // Sortir de la fonction sans modifier l'état
        }
      }
    }

    setVoteItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          // Double vérification au cas où la première aurait échoué
          if (item.userHasPosition && item.userPositionDirection !== VoteDirection.None &&
            direction !== VoteDirection.None && item.userPositionDirection !== direction) {
            // User is trying to vote in the opposite direction of their existing position
            return item; // Don't change anything
          }

          if (item.direction !== direction && item.direction !== VoteDirection.None) {
            return { ...item, units, direction };
          }

          if (units === 0) {
            return { ...item, units: 0, direction: VoteDirection.None };
          }

          return { ...item, units, direction };
        }
        return item;
      })
    );
  };

  // Function to reset all votes
  const resetAllVotes = () => {
    setVoteItems((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        units: 0,
        direction: VoteDirection.None,
      }))
    );
  };

  // Calculate number of transactions that will be executed
  const numberOfTransactions = voteItems.filter(item => item.units > 0).length;

  // Check if a vote in the given direction is allowed for the given triple ID
  const isVoteDirectionAllowed = (tripleId: bigint, direction: VoteDirection) => {
    const item = voteItems.find(item => item.id === tripleId);
    if (!item || !item.userHasPosition) return true;

    // If user has no position or wants to vote in the same direction, it's allowed
    const allowed = item.userPositionDirection === VoteDirection.None || item.userPositionDirection === direction;
    return allowed;
  };

  return {
    voteItems,
    setVoteItems,
    isLoading: isLoading || loadingPositions,
    totalUnits,
    numberOfTransactions,
    handleChangeUnits,
    resetAllVotes,
    loadTripleDetails,
    isVoteDirectionAllowed,
    userPositions
  };
}; 
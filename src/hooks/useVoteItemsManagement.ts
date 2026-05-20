import { useState, useEffect } from "react";
import { VoteItem, VoteDirection } from "../types/vote";
import { Network, API_URLS } from "./useAtomData";
import { useGameContext } from '../contexts/GameContext';
import { useFetchTripleDetails, TripleDetails } from "./useFetchTripleDetails";

interface UseVoteItemsManagementProps {
  network?: Network;
  walletAddress?: string;
  onError?: (message: string) => void;
}

export const useVoteItemsManagement = ({
  network = Network.MAINNET,
  walletAddress = "",
  onError,
}: UseVoteItemsManagementProps) => {
  const [voteItems, setVoteItems] = useState<VoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { activeGame } = useGameContext();
  const PREDEFINED_CLAIM_IDS = activeGame?.claims.map(c => c.atomId) ?? [];
  const [totalUnits, setTotalUnits] = useState(0);
  const [userPositions, setUserPositions] = useState<Record<string, VoteDirection>>({});
  const [userSharesMap, setUserSharesMap] = useState<Record<string, { termId: string; shares: bigint; curveId: bigint }>>({});
  const [hasLoadedTripleDetails, setHasLoadedTripleDetails] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Reset when the active game changes so the claim list reloads for the new game.
  useEffect(() => {
    setHasLoadedTripleDetails(false);
    setVoteItems([]);
    setUserPositionsData(null);
    setIsLoading(true);
  }, [activeGame?.atomId]);

  const refreshPositions = () => {
    setHasLoadedTripleDetails(false);
    setUserPositionsData(null);
    setRefreshKey(k => k + 1);
  };

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
            variables: { tripleIds: PREDEFINED_CLAIM_IDS.map(id => id.toString()) }
          })
        });

        if (!response.ok) throw new Error(`GraphQL request failed with status ${response.status}`);
        const result = await response.json();
        if (result.errors) throw new Error(result.errors[0].message);

        const triples = result.data?.triples || [];
        const termIds = [...new Set(triples.map((t: any) => t.term_id).filter(Boolean))];
        const counterTermIds = [...new Set(triples.map((t: any) => t.counter_term_id).filter(Boolean))];
        const allTermIds = [...new Set([...termIds, ...counterTermIds])];

        let termPositionsMap = new Map();
        // Map term_id → { shares, curve_id } for the current user's positions
        const positionSharesMap = new Map<string, { shares: string; curve_id: string }>();

        if (allTermIds.length > 0) {
          const positionsQuery = `
            query GetTermPositions($termIds: [String!]!, $walletAddress: String!) {
              positions(where: { term_id: { _in: $termIds }, account_id: { _ilike: $walletAddress }, shares: { _gt: 0 } }) {
                term_id
                shares
                curve_id
              }
            }
          `;

          const positionsResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: positionsQuery,
              variables: { termIds: allTermIds, walletAddress: walletAddress.toLowerCase() }
            })
          });

          const positionsResult = await positionsResponse.json();
          if (!positionsResult.errors) {
            const positionsByTermId = new Map<string, number>();
            (positionsResult.data?.positions || []).forEach((pos: any) => {
              const count = positionsByTermId.get(pos.term_id) || 0;
              positionsByTermId.set(pos.term_id, count + 1);
              if (!positionSharesMap.has(pos.term_id)) {
                positionSharesMap.set(pos.term_id, { shares: pos.shares, curve_id: pos.curve_id ?? '1' });
              }
            });
            positionsByTermId.forEach((count, termId) => {
              termPositionsMap.set(termId, {
                term_id: termId,
                positions_aggregate: { aggregate: { count } }
              });
            });
          }
        }

        const positionsData: any = { triples: [] };

        triples.forEach((triple: any) => {
          const termPositions = termPositionsMap.get(triple.term_id);
          const counterTermPositions = termPositionsMap.get(triple.counter_term_id);

          const hasTermPositions = (termPositions?.positions_aggregate?.aggregate?.count || 0) > 0;
          const hasCounterTermPositions = (counterTermPositions?.positions_aggregate?.aggregate?.count || 0) > 0;

          // Determine which vault holds the user's current position (for redeem on switch)
          const termSharesInfo = positionSharesMap.get(triple.term_id);
          const counterTermSharesInfo = positionSharesMap.get(triple.counter_term_id);
          const userPositionTermId = hasTermPositions ? triple.term_id : hasCounterTermPositions ? triple.counter_term_id : undefined;
          const sharesInfo = hasTermPositions ? termSharesInfo : hasCounterTermPositions ? counterTermSharesInfo : undefined;

          positionsData.triples.push({
            term_id: triple.term_id,
            id: triple.term_id,
            hasTermPosition: hasTermPositions,
            hasCounterTermPosition: hasCounterTermPositions,
            term: termPositions,
            counter_term: counterTermPositions,
            userPositionTermId,
            userSharesRaw: sharesInfo?.shares,
            userCurveIdRaw: sharesInfo?.curve_id,
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
  }, [walletAddress, PREDEFINED_CLAIM_IDS.join(','), network, refreshKey]);

  // Process user positions data when it arrives
  useEffect(() => {
    if (userPositionsData && !loadingPositions && walletAddress) {
      const positions: Record<string, VoteDirection> = {};
      const sharesRecord: Record<string, { termId: string; shares: bigint; curveId: bigint }> = {};

      if (userPositionsData.triples && Array.isArray(userPositionsData.triples)) {
        userPositionsData.triples.forEach((triple: any) => {
          const tripleId = triple.term_id || triple.id;
          if (!tripleId) return;

          if (triple.hasTermPosition) {
            positions[String(tripleId)] = VoteDirection.For;
          } else if (triple.hasCounterTermPosition) {
            positions[String(tripleId)] = VoteDirection.Against;
          }

          if (triple.userPositionTermId && triple.userSharesRaw) {
            sharesRecord[String(tripleId)] = {
              termId: triple.userPositionTermId,
              shares: BigInt(triple.userSharesRaw),
              curveId: BigInt(triple.userCurveIdRaw ?? '1'),
            };
          }
        });
      }

      setUserPositions(positions);
      setUserSharesMap(sharesRecord);

      setVoteItems(prevItems => {
        if (prevItems.length === 0) return prevItems;
        return prevItems.map(item => {
          const normalizedItemId = item.term_id || String(item.id);
          const positionDirection = positions[normalizedItemId] || positions[String(item.id)] || VoteDirection.None;
          const sharesInfo = sharesRecord[normalizedItemId] || sharesRecord[String(item.id)];
          return {
            ...item,
            userHasPosition: positionDirection !== VoteDirection.None,
            userPositionDirection: positionDirection,
            userPositionTermId: sharesInfo?.termId,
            userShares: sharesInfo?.shares,
            userCurveId: sharesInfo?.curveId,
          };
        });
      });

      if (!hasLoadedTripleDetails) {
        loadTripleDetails(positions, sharesRecord).then(() => {
          setHasLoadedTripleDetails(true);
        }).catch((error) => {
          console.error("Error in loadTripleDetails:", error);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPositionsData, loadingPositions, walletAddress, hasLoadedTripleDetails]);

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
                  image
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
                  positions_aggregate(where: { shares: { _gt: 0 } }) {
                    aggregate { count }
                  }
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

      const positionsCountMap = new Map<string, number>(
        [...termsMap.entries()].map(([id, term]) => [
          id,
          term.positions_aggregate?.aggregate?.count ?? 0,
        ])
      );

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
  const loadTripleDetails = async (
    currentUserPositions?: Record<string, VoteDirection>,
    currentSharesMap?: Record<string, { termId: string; shares: bigint; curveId: bigint }>
  ) => {
    setIsLoading(true);

    try {
      // ÉTAPE 1: Fetch tous les détails en une seule requête batch (au lieu de 29 requêtes individuelles)
      const triplesDetailsMap = await fetchTriplesDetailsBatch(PREDEFINED_CLAIM_IDS);

      const positionsToUse = currentUserPositions || userPositions;
      const sharesToUse = currentSharesMap || userSharesMap;

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

        const sharesInfo = sharesToUse[normalizedId] || sharesToUse[String(id)];

        return {
          id: BigInt(details.id),
          subject: details.subject?.label || `Subject ${id}`,
          predicate: details.predicate?.label || "is",
          object: details.object?.label || `Object ${id}`,
          subject_image: (details.subject as any)?.image || null,
          object_image: (details.object as any)?.image || null,
          subject_term_id: (details.subject as any)?.term_id || null,
          object_term_id: (details.object as any)?.term_id || null,
          units: 0,
          direction: VoteDirection.None,
          term_id: details.term_id,
          term_position_count: details.term_position_count || 0,
          counter_term_id: details.counter_term_id,
          counter_term_position_count: details.counter_term_position_count || 0,
          userHasPosition: userPositionDirection !== VoteDirection.None,
          userPositionDirection,
          userPositionTermId: sharesInfo?.termId,
          userShares: sharesInfo?.shares,
          userCurveId: sharesInfo?.curveId,
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
    setVoteItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;
        if (units === 0) return { ...item, units: 0, direction: VoteDirection.None };
        return { ...item, units, direction };
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

  // All directions allowed — switching redeems existing position on submit
  const isVoteDirectionAllowed = (_tripleId: bigint, _direction: VoteDirection) => true;

  return {
    voteItems,
    setVoteItems,
    isLoading: isLoading || loadingPositions,
    totalUnits,
    numberOfTransactions,
    handleChangeUnits,
    resetAllVotes,
    refreshPositions,
    loadTripleDetails,
    isVoteDirectionAllowed,
    userPositions
  };
}; 
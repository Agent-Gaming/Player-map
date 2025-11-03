// Vote-specific utilities for retry, cache, and loading optimization
// These utilities wrap the existing hooks with additional functionality

import { useState, useEffect } from "react";
import { VoteItem, VoteDirection } from "../../types/vote";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import { Network } from "../../hooks/useAtomData";
import { useFetchTripleDetails, TripleDetails } from "../../hooks/useFetchTripleDetails";
import { useDisplayTriplesWithPosition } from "../../hooks/useDisplayTriplesWithPosition";

// Cache interfaces
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface LoadingProgress {
  loaded: number;
  total: number;
}

// Global caches for vote-specific data
const tripleDetailsCache = new Map<string, CacheEntry<TripleDetails | null>>();
const userPositionsCache = new Map<string, CacheEntry<any>>();

// Cache configuration
const TRIPLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const USER_POSITIONS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const MAX_CACHE_SIZE = 100;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

// Cache management functions
const getCacheKey = (key: string): string => key;

const isCacheValid = <T>(entry: CacheEntry<T>): boolean => {
  const now = Date.now();
  return (now - entry.timestamp) < entry.ttl;
};

const getFromCache = <T>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
  const entry = cache.get(key);
  if (!entry || !isCacheValid(entry)) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

const setCache = <T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number): void => {
  // Clean up old entries if cache is too large
  if (cache.size >= MAX_CACHE_SIZE) {
    const iter = cache.keys().next();
    if (!iter.done) {
      cache.delete(iter.value);
    }
  }
  
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
};

// Retry function with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delays: number[] = RETRY_DELAYS
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = delays[attempt] || delays[delays.length - 1];
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Enhanced fetch triple details with cache and retry
export const useVoteFetchTripleDetails = (network: Network = Network.MAINNET) => {
  const { fetchTripleDetails: originalFetch, isLoading } = useFetchTripleDetails({ network });

  const fetchTripleDetailsWithCache = async (tripleId: string): Promise<TripleDetails | null> => {
    // Safety check for empty or invalid tripleId
    if (!tripleId || tripleId.trim() === '') {
      console.warn('Invalid tripleId provided to fetchTripleDetailsWithCache');
      return null;
    }

    const cacheKey = getCacheKey(`${network}-${tripleId}`);
    
    // Check cache first
    const cachedData = getFromCache(tripleDetailsCache, cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }

    try {
      const result = await retryWithBackoff(async () => {
        return await originalFetch(tripleId);
      });

      // Cache the result
      setCache(tripleDetailsCache, cacheKey, result, TRIPLE_CACHE_TTL);
      
      return result;
    } catch (error) {
      console.error(`Error fetching triple details for ${tripleId}:`, error);
      // Cache the null result to avoid repeated failed requests
      setCache(tripleDetailsCache, cacheKey, null, TRIPLE_CACHE_TTL);
      return null; // Return null instead of throwing to prevent crashes
    }
  };

  return {
    fetchTripleDetails: fetchTripleDetailsWithCache,
    isLoading
  };
};

// Enhanced user positions with cache
export const useVoteDisplayTriplesWithPosition = (walletAddress: string) => {
  const { data: originalData, loading: originalLoading, error: originalError } = useDisplayTriplesWithPosition(walletAddress);

  // Check cache first
  const cacheKey = getCacheKey(`user-positions-${walletAddress.toLowerCase()}`);
  const cachedData = getFromCache(userPositionsCache, cacheKey);

  if (cachedData !== null) {
    return {
      data: cachedData,
      loading: false,
      error: null
    };
  }

  // Cache the data when it arrives
  if (originalData && !originalLoading) {
    setCache(userPositionsCache, cacheKey, originalData, USER_POSITIONS_CACHE_TTL);
  }

  return {
    data: originalData,
    loading: originalLoading,
    error: originalError
  };
};

// Enhanced vote items management with progress tracking
export const useVoteItemsManagementOptimized = ({
  network = Network.MAINNET,
  walletAddress = "",
  onError,
  constants
}: {
  network?: Network;
  walletAddress?: string;
  onError?: (message: string) => void;
  constants: DefaultPlayerMapConstants;
}) => {
  const [voteItems, setVoteItems] = useState<VoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({ loaded: 0, total: 0 });
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [isLoadingInProgress, setIsLoadingInProgress] = useState(false);
  
  const { PREDEFINED_CLAIM_IDS } = constants;
  const [totalUnits, setTotalUnits] = useState(0);
  const [userPositions, setUserPositions] = useState<Record<string, VoteDirection>>({});

  // Use enhanced hooks
  const { fetchTripleDetails } = useVoteFetchTripleDetails(network);
  const { data: userPositionsData, loading: loadingPositions } = useVoteDisplayTriplesWithPosition(walletAddress);

  // Process user positions data when it arrives
  useEffect(() => {
    if (userPositionsData && !loadingPositions && walletAddress) {
      const positions: Record<string, VoteDirection> = {};

      // Process positions data (same logic as original)
      if (userPositionsData.triples && Array.isArray(userPositionsData.triples)) {
        userPositionsData.triples.forEach((triple: any) => {
          if (!triple.id) return;

          const termPositions = triple.term?.positions || [];
          const counterTermPositions = triple.counter_term?.positions || [];

          const userTermPosition = termPositions.find((position: any) => {
            return position.account?.id?.toLowerCase() === walletAddress.toLowerCase();
          });

          const userCounterTermPosition = counterTermPositions.find((position: any) => {
            return position.account?.id?.toLowerCase() === walletAddress.toLowerCase();
          });

          if (userTermPosition) {
            positions[String(triple.id)] = VoteDirection.For;
          } else if (userCounterTermPosition) {
            positions[String(triple.id)] = VoteDirection.Against;
          }
        });
      }

      setUserPositions(positions);

      // Update existing vote items with user position information
      setVoteItems(prevItems =>
        prevItems.map(item => {
          const positionDirection = positions[String(item.id)] || VoteDirection.None;
          const hasPosition = positionDirection !== VoteDirection.None;
          return {
            ...item,
            userHasPosition: hasPosition,
            userPositionDirection: positionDirection
          };
        })
      );
    }
  }, [userPositionsData, loadingPositions, walletAddress]);

  // Load triple details with progress tracking
  const loadTripleDetails = async () => {
    // Prevent multiple simultaneous loading attempts
    if (isLoadingInProgress) {
      console.log('Loading already in progress, skipping...');
      return;
    }

    // Safety check for empty or invalid constants
    if (!PREDEFINED_CLAIM_IDS || PREDEFINED_CLAIM_IDS.length === 0) {
      console.warn('No predefined claim IDs available');
      setIsLoading(false);
      setIsFullyLoaded(true);
      return;
    }

    setIsLoadingInProgress(true);
    setIsLoading(true);
    setIsFullyLoaded(false);
    setLoadingProgress({ loaded: 0, total: PREDEFINED_CLAIM_IDS.length });

    try {
      const loadedItems: VoteItem[] = [];
      let loadedCount = 0;

      // Process claims one by one to track progress
      for (const id of PREDEFINED_CLAIM_IDS) {
        // Safety check for valid ID
        if (!id || id.trim() === '') {
          console.warn('Invalid claim ID found:', id);
          continue;
        }

        try {
          const details = await fetchTripleDetails(id);

          let voteItem: VoteItem;

          if (!details) {
            voteItem = {
              id: BigInt(id),
              subject: `Claim ${id}`,
              predicate: "is",
              object: "Unknown",
              units: 0,
              direction: VoteDirection.None,
              userHasPosition: false,
              userPositionDirection: VoteDirection.None,
            } as VoteItem;
          } else {
            const userPositionDirection = userPositions[String(id)] || VoteDirection.None;

            voteItem = {
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
          }

          loadedItems.push(voteItem);
          loadedCount++;
          
          // Update progress
          setLoadingProgress({ loaded: loadedCount, total: PREDEFINED_CLAIM_IDS.length });
          
          // Update vote items progressively
          setVoteItems([...loadedItems]);
          
        } catch (error) {
          console.error(`Error loading claim ${id}:`, error);
          // Add error item but don't crash the entire loading process
          try {
            loadedItems.push({
              id: BigInt(id),
              subject: `Claim ${id}`,
              predicate: "is",
              object: "Error",
              units: 0,
              direction: VoteDirection.None,
              userHasPosition: false,
              userPositionDirection: VoteDirection.None,
            } as VoteItem);
          } catch (bigIntError) {
            console.error(`Error creating BigInt for ${id}:`, bigIntError);
            // Skip this item if we can't create the BigInt
          }
          loadedCount++;
          setLoadingProgress({ loaded: loadedCount, total: PREDEFINED_CLAIM_IDS.length });
        }
      }

      setVoteItems(loadedItems);
      setIsFullyLoaded(true);
    } catch (error) {
      if (onError) {
        onError("Error: Failed to fetch triple details");
      }
    } finally {
      setIsLoading(false);
      setIsLoadingInProgress(false);
    }
  };

  // Initialize loading with safety checks
  useEffect(() => {
    // Only load if we have valid constants and are not already loading
    if (PREDEFINED_CLAIM_IDS && PREDEFINED_CLAIM_IDS.length > 0 && !isLoadingInProgress) {
      loadTripleDetails();
    }
  }, [PREDEFINED_CLAIM_IDS]);

  // Update total units when voteItems change
  useEffect(() => {
    const total = voteItems.reduce((sum, item) => sum + item.units, 0);
    setTotalUnits(total);
  }, [voteItems]);

  // Vote management functions (same as original)
  const handleChangeUnits = (id: bigint, direction: VoteDirection, units: number) => {
    setVoteItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          if (item.userHasPosition && item.userPositionDirection !== VoteDirection.None &&
            direction !== VoteDirection.None && item.userPositionDirection !== direction) {
            return item;
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

  const resetAllVotes = () => {
    setVoteItems((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        units: 0,
        direction: VoteDirection.None,
      }))
    );
  };

  const isVoteDirectionAllowed = (tripleId: bigint, direction: VoteDirection) => {
    const item = voteItems.find(item => item.id === tripleId);
    if (!item || !item.userHasPosition) return true;
    return item.userPositionDirection === VoteDirection.None || item.userPositionDirection === direction;
  };

  const numberOfTransactions = voteItems.filter(item => item.units > 0).length;

  return {
    voteItems,
    setVoteItems,
    isLoading: isLoading || loadingPositions,
    isFullyLoaded: isFullyLoaded && !loadingPositions,
    loadingProgress,
    totalUnits,
    numberOfTransactions,
    handleChangeUnits,
    resetAllVotes,
    loadTripleDetails,
    isVoteDirectionAllowed,
    userPositions
  };
};

// Cache management utilities
export const clearVoteCaches = () => {
  tripleDetailsCache.clear();
  userPositionsCache.clear();
};

export const getVoteCacheStats = () => {
  return {
    tripleCache: {
      size: tripleDetailsCache.size,
      maxSize: MAX_CACHE_SIZE,
      ttl: TRIPLE_CACHE_TTL
    },
    userPositionsCache: {
      size: userPositionsCache.size,
      maxSize: MAX_CACHE_SIZE,
      ttl: USER_POSITIONS_CACHE_TTL
    }
  };
};

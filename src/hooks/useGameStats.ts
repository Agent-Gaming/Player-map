import { useState, useEffect } from "react";
import { Network, API_URLS } from "./useAtomData";
import { useGameContext } from '../contexts/GameContext';
import { PREDICATES } from '../utils/constants';

export interface GameStats {
  gameName: string;
  gameImage: string | null;
  gameTermId: string | null;
  totalGuilds: number;
  totalPlayers: number;
  totalVotes: number;        // total votes (positions) sur les claims prédéfinis
  totalAttestations: number; // total positions sur les triples du jeu
  loading: boolean;
  error: string | null;
}

export const useGameStats = (
  network: Network = Network.MAINNET
): GameStats => {
  const [gameName, setGameName] = useState("");
  const [gameImage, setGameImage] = useState<string | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalAttestations, setTotalAttestations] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { activeGame } = useGameContext();
  const gamesId = activeGame?.atomId;
  const isPlayerOfId = PREDICATES.IS_PLAYER_OF;
  const claimAtomIds = activeGame?.claims.map(c => c.atomId) ?? [];
  const totalGuilds = activeGame?.guilds.length ?? 0;

  useEffect(() => {
    if (!gamesId || !isPlayerOfId || claimAtomIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiUrl = API_URLS[network];

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query GameStats($gamesId: String!, $isPlayerOfId: String!, $claimAtomIds: [String!]!) {
                gameAtom: atoms(where: { term_id: { _eq: $gamesId } }) {
                  term_id
                  label
                  image
                }
                players: triples_aggregate(where: {
                  predicate_id: { _eq: $isPlayerOfId }
                  object_id: { _eq: $gamesId }
                }) {
                  aggregate { count }
                }
                votes: positions_aggregate(where: {
                  term: {
                    triple: { object_id: { _in: $claimAtomIds } }
                  }
                  shares: { _gt: 0 }
                }) {
                  aggregate { count }
                }
                attestations: positions_aggregate(where: {
                  term: {
                    triple: {
                      object_id: { _eq: $gamesId }
                    }
                  }
                  shares: { _gt: 0 }
                }) {
                  aggregate { count }
                }
              }
            `,
            variables: { gamesId, isPlayerOfId, claimAtomIds },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          console.error("GameStats GraphQL errors:", result.errors);
          setError("Failed to fetch game stats");
          return;
        }

        const { gameAtom, players, votes, attestations } = result.data ?? {};

        if (gameAtom?.[0]) {
          setGameName(gameAtom[0].label ?? "");
          setGameImage(gameAtom[0].image ?? null);
        }

        setTotalPlayers(players?.aggregate?.count ?? 0);
        setTotalVotes(votes?.aggregate?.count ?? 0);
        setTotalAttestations(attestations?.aggregate?.count ?? 0);
      } catch (err) {
        console.error("useGameStats error:", err);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [gamesId, isPlayerOfId, network, claimAtomIds.join(',')]);

  return {
    gameName,
    gameImage,
    gameTermId: gamesId ?? null,
    totalGuilds,
    totalPlayers,
    totalVotes,
    totalAttestations,
    loading,
    error,
  };
};

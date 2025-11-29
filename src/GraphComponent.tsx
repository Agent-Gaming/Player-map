import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Network, API_URLS } from "./hooks/useAtomData";
import { useTripleByCreator } from "./hooks/useTripleByCreator";
import { fetchPositions } from "./api/fetchPositions";
import PlayerMapHome from "./PlayerMapHome";
import PlayerMapGraph from "./PlayerMapGraph";
import RegistrationForm from "./RegistrationForm";
import { PLAYER_TRIPLE_TYPES } from "./utils/constants";
import { ConnectWalletModal } from "./components/modals";
import VotingModal from "./components/vote/VotingModal";
import { PlayerMapQueryClientProvider } from "./contexts/QueryClientContext";
import {
  PlayerMapConfig,
  DefaultPlayerMapConstants,
} from "./types/PlayerMapConfig";
import { usePlayerConstants } from "./hooks/usePlayerConstants";
import initGraphql from "./config/graphql";

interface GraphComponentProps {
  walletConnected?: boolean;
  walletAddress?: string;
  wagmiConfig?: any;
  walletHooks?: any;
  isOpen?: boolean;
  onClose?: () => void;
  onCreatePlayer?: () => void;
  onConnectWallet?: () => void;
  config?: PlayerMapConfig; // Configuration avec constantes personnalisées
}

const GraphComponent: React.FC<GraphComponentProps> = ({
  walletConnected = false,
  walletAddress = "",
  wagmiConfig,
  walletHooks,
  onClose,
  onCreatePlayer,
  onConnectWallet,
  config, // Configuration avec constantes personnalisées
}) => {
  // Initialiser GraphQL au démarrage du composant
  useEffect(() => {
    initGraphql();
  }, []);

  // Récupérer les constantes (personnalisées ou par défaut)
  const constants: DefaultPlayerMapConstants = usePlayerConstants(config);

  // État pour suivre le réseau actuel (par défaut testnet)
  const [network, setNetwork] = useState<Network>(Network.MAINNET);

  // État local pour le formulaire d'inscription
  const [isRegistrationFormOpen, setIsRegistrationFormOpen] = useState(false);

  // État local pour la modal de vote
  const [isVotingOpen, setIsVotingOpen] = useState(false);

  // État pour la détection du wallet (plus fiable)
  const [isWalletReady, setIsWalletReady] = useState(false);

  // État pour les positions actives
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState<Error | null>(null);
  const lastFetchAttemptRef = useRef<number>(0);
  const last429ErrorRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  const lowerCaseAddress = walletAddress ? walletAddress : "";

  // Vérifier si le wallet est réellement connecté
  useEffect(() => {
    // Considérer qu'un wallet est connecté s'il y a une adresse non vide
    const hasConnectedWallet = Boolean(walletAddress && walletAddress !== "");
    setIsWalletReady(hasConnectedWallet);
  }, [walletAddress]);

  const {
    loading: tripleLoading,
    error: tripleError,
    triples: playerTriplesRaw,
  } = useTripleByCreator(
    lowerCaseAddress,
    constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId,
    constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId,
    network
  );

  // Mémoriser playerTriples avec une clé stable basée sur term_id pour éviter les re-renders inutiles
  const playerTriples = useMemo(() => {
    if (!playerTriplesRaw || playerTriplesRaw.length === 0) {
      return [];
    }
    // Créer une clé stable basée sur les term_id triés
    return [...playerTriplesRaw];
  }, [playerTriplesRaw]);

  // Créer une clé stable pour les playerTriples players (pour la dépendance useEffect)
  const playerTriplesKey = useMemo(() => {
    if (!playerTriples || playerTriples.length === 0) {
      return "";
    }
    const playerGameTriples = playerTriples.filter(
      (triple) =>
        triple.predicate_id ===
          constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId &&
        triple.object_id === constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId
    );
    return playerGameTriples
      .map((t) => t.term_id)
      .sort()
      .join(",");
  }, [
    playerTriples,
    constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId,
    constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId,
  ]);

  // Récupérer les positions actives quand le wallet est connecté
  useEffect(() => {
    const fetchActivePositions = async () => {
      // Guard 1: Vérifier les conditions de base
      if (!isWalletReady || !walletAddress) {
        setActivePositions([]);
        setPositionsError(null);
        return;
      }

      // Guard 2: Ne pas fetch si on est déjà en train de charger
      if (isFetchingRef.current) {
        return;
      }

      // Guard 3: Ne pas fetch si on a eu une erreur 429 il y a moins de 30 secondes
      const now = Date.now();
      const timeSinceLast429 = now - last429ErrorRef.current;
      if (timeSinceLast429 < 30000) {
        console.warn(
          "[GraphComponent] Skip fetch: Too many requests recently (429 error)"
        );
        return;
      }

      // Guard 4: Ne pas fetch si les triples ne sont pas encore chargés ou en erreur
      if (tripleLoading || tripleError) {
        return;
      }

      // Guard 5: Ne pas fetch si pas de triples (évite une requête inutile)
      if (!playerTriples || playerTriples.length === 0) {
        setActivePositions([]);
        return;
      }

      // Guard 6: Éviter les fetches trop fréquents (débounce)
      const timeSinceLastFetch = now - lastFetchAttemptRef.current;
      if (timeSinceLastFetch < 1000) {
        console.warn("[GraphComponent] Skip fetch: Too frequent requests");
        return;
      }

      lastFetchAttemptRef.current = now;
      isFetchingRef.current = true;
      setPositionsLoading(true);
      setPositionsError(null);

      try {
        // Filtrer les triples pour ne garder que ceux avec "is player of" + "Boss Fighters"
        const playerGameTriples = playerTriples.filter(
          (triple) =>
            triple.predicate_id ===
              constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId &&
            triple.object_id ===
              constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId
        );
        const playerTripleTermIds = playerGameTriples.map(
          (triple) => triple.term_id
        );

        // Si pas de triples joueur, pas besoin de chercher les positions
        if (playerTripleTermIds.length === 0) {
          setActivePositions([]);
          return;
        }

        // Faire une requête GraphQL filtrée directement sur les term_id des triples joueur
        const apiUrl = API_URLS[network];

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query GetPlayerPositions($accountId: String!, $termIds: [String!]!) {
                positions(where: { 
                  account_id: { _eq: $accountId },
                  term_id: { _in: $termIds },
                  shares: { _gt: 0 }
                }) {
                  id
                  shares
                  curve_id
                  account_id
                  term_id
                }
              }
            `,
            variables: {
              accountId: walletAddress,
              termIds: playerTripleTermIds,
            },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          console.error("[GraphComponent] GraphQL errors:", result.errors);
          throw new Error(result.errors[0]?.message || "GraphQL error");
        }

        const gamePositions = result.data?.positions || [];

        // Enrich positions with term details
        if (gamePositions.length > 0) {
          const termIds = [
            ...new Set(
              gamePositions.map((p: any) => p.term_id).filter(Boolean)
            ),
          ];

          if (termIds.length > 0) {
            const termsResponse = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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
                variables: { termIds },
              }),
            });

            const termsResult = await termsResponse.json();

            if (!termsResult.errors && termsResult.data?.terms) {
              const terms = termsResult.data.terms;
              const atomIds = [
                ...new Set(terms.map((t: any) => t.atom_id).filter(Boolean)),
              ];
              const tripleIds = [
                ...new Set(terms.map((t: any) => t.triple_id).filter(Boolean)),
              ];

              // Fetch atoms and triples separately
              const [atomsResponse, triplesResponse] = await Promise.all([
                atomIds.length > 0
                  ? fetch(apiUrl, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        query: `
                      query GetAtoms($atomIds: [String!]!) {
                        atoms(where: { term_id: { _in: $atomIds } }) {
                          term_id
                          label
                        }
                      }
                    `,
                        variables: { atomIds },
                      }),
                    })
                  : Promise.resolve(null),
                tripleIds.length > 0
                  ? fetch(apiUrl, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        query: `
                      query GetTriples($tripleIds: [String!]!) {
                        triples(where: { term_id: { _in: $tripleIds } }) {
                          term_id
                          subject_id
                          predicate_id
                          object_id
                        }
                      }
                    `,
                        variables: { tripleIds },
                      }),
                    })
                  : Promise.resolve(null),
              ]);

              const atomsData = atomsResponse
                ? await atomsResponse.json()
                : { data: { atoms: [] } };
              const triplesData = triplesResponse
                ? await triplesResponse.json()
                : { data: { triples: [] } };

              const atomsMap = new Map(
                (atomsData.data?.atoms || []).map((atom: any) => [
                  atom.term_id,
                  atom,
                ])
              );
              const triplesMap = new Map(
                (triplesData.data?.triples || []).map((triple: any) => [
                  triple.term_id,
                  triple,
                ])
              );

              const termsMap = new Map(
                terms.map((term: any) => [
                  term.id,
                  {
                    ...term,
                    atom: atomsMap.get(term.atom_id) || null,
                    triple: triplesMap.get(term.triple_id) || null,
                  },
                ])
              );

              const enrichedPositions = gamePositions.map((pos: any) => ({
                ...pos,
                term: termsMap.get(pos.term_id) || null,
              }));

              setActivePositions(enrichedPositions);
            } else {
              setActivePositions(gamePositions);
            }
          } else {
            setActivePositions(gamePositions);
          }
        } else {
          setActivePositions(gamePositions);
        }
      } catch (error: any) {
        console.error("Error fetching positions:", error);

        // Si c'est une erreur 429, enregistrer le timestamp et ne pas re-fetch pendant 30 secondes
        if (
          error?.message?.includes("429") ||
          error?.status === 429 ||
          error?.response?.status === 429
        ) {
          last429ErrorRef.current = Date.now();
          console.warn(
            "[GraphComponent] Rate limit hit (429), will retry after 30 seconds"
          );
        }

        setPositionsError(error);
        // Ne pas vider activePositions en cas d'erreur pour garder les données précédentes
      } finally {
        isFetchingRef.current = false;
        setPositionsLoading(false);
      }
    };

    fetchActivePositions();
  }, [
    isWalletReady,
    walletAddress,
    network,
    playerTriplesKey,
    tripleLoading,
    tripleError,
  ]);

  // Vérifie si l'utilisateur a un player atom ET des positions actives
  const hasPlayerAtom = playerTriples.length > 0;
  const hasActivePositions = activePositions.length > 0;
  const hasConfirmedPlayer = hasPlayerAtom && hasActivePositions;
  const isLoading = tripleLoading || positionsLoading;
  const hasError = tripleError;

  // Fonction pour gérer le clic sur le bouton Create Player dans notre composant
  const handleCreatePlayer = useCallback(() => {
    // Si une fonction externe existe, appeler d'abord cette fonction
    if (onCreatePlayer) {
      onCreatePlayer();
    }

    // Dans tous les cas, ouvrir notre formulaire interne
    setIsRegistrationFormOpen(true);
  }, [onCreatePlayer]);

  // Fonction pour fermer le formulaire d'inscription
  const handleCloseRegistrationForm = useCallback(() => {
    setIsRegistrationFormOpen(false);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Fonction pour gérer la connexion du wallet
  const handleConnectWallet = useCallback(() => {
    if (onConnectWallet) {
      onConnectWallet();
    }
  }, [onConnectWallet]);

  // Gestion des erreurs de chargement
  if (hasError) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <h2 style={{ color: "red", textAlign: "center" }}>
          Erreur lors du chargement des données
        </h2>
        <p style={{ textAlign: "center", color: "#666" }}>
          {hasError.message || "Une erreur inattendue s'est produite"}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#FFD32A",
            color: "#000",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Recharger la page
        </button>
      </div>
    );
  }

  // Affichage de chargement
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "4px solid #FFD32A",
            borderTop: "4px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ textAlign: "center", color: "#666" }}>
          Chargement des données du joueur...
        </p>
      </div>
    );
  }

  // Logique principale d'affichage
  return (
    <PlayerMapQueryClientProvider>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* Utiliser notre nouvelle modal de connexion wallet */}
        <ConnectWalletModal
          isOpen={!isWalletReady}
          onConnectWallet={handleConnectWallet}
        />

        {/* Affichage du PlayerMapHome, soit blurred en arrière-plan si wallet non connecté, soit normale si wallet connecté mais pas de player confirmé */}
        {(!isWalletReady || (isWalletReady && !hasConfirmedPlayer)) && (
          <div
            style={{
              filter: !isWalletReady ? "blur(3px)" : "none",
              opacity: !isWalletReady ? 0.7 : 1,
              position: "relative",
            }}
          >
            <PlayerMapHome
              walletConnected={isWalletReady}
              walletAddress={walletAddress}
              wagmiConfig={wagmiConfig}
              walletHooks={walletHooks}
              // Passer notre propre gestionnaire de clic, pas celui externe
              onCreatePlayer={handleCreatePlayer}
            />
          </div>
        )}

        {/* Si wallet connecté et player confirmé (atom + positions actives), afficher le PlayerMapGraph */}
        {isWalletReady && hasConfirmedPlayer && (
          <PlayerMapGraph
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            walletHooks={walletHooks}
            onOpenVoting={() => setIsVotingOpen(true)}
            constants={constants} // Passer les constantes directement
            gamesId={constants.COMMON_IDS.GAMES_ID} // Passer GAMES_ID à playermap-graph
            wagmiConfig={wagmiConfig} // Passer wagmiConfig
          />
        )}

        {/* Formulaire d'inscription - géré directement par GraphComponent avec le QueryClient local */}
        <RegistrationForm
          isOpen={isRegistrationFormOpen}
          onClose={handleCloseRegistrationForm}
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          wagmiConfig={wagmiConfig}
          walletHooks={walletHooks}
          constants={constants} // Passer les constantes personnalisées !
        />

        {/* Modal de vote - seulement si wallet connecté et player confirmé */}
        {isVotingOpen && isWalletReady && hasConfirmedPlayer && (
          <VotingModal
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            publicClient={wagmiConfig?.publicClient}
            wagmiConfig={wagmiConfig}
            onClose={() => setIsVotingOpen(false)}
            constants={constants} // Passer les constantes directement
          />
        )}
      </div>
    </PlayerMapQueryClientProvider>
  );
};

export default GraphComponent;

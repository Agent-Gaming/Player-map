import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Network, API_URLS } from "./hooks/useAtomData";
import { useTripleByCreator } from "./hooks/useTripleByCreator";
import { usePositions } from "./hooks/usePositions";
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

const GraphComponentInner: React.FC<GraphComponentProps> = ({
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

  const {
    positions: activePositions,
    loading: positionsLoading,
    error: positionsError,
  } = usePositions(
    isWalletReady ? walletAddress : undefined, // Ne charge que si wallet connecté
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
    <>
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

        {/* Layout principal : graphe + panneau speak-up côte à côte */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Zone graphe — flex:1 pour occuper l'espace restant */}
          <div style={{ flex: 1, overflow: "hidden", height: "100%", position: "relative" }}>
            {/* Si wallet connecté et player confirmé, afficher le PlayerMapGraph */}
            {isWalletReady && hasConfirmedPlayer && (
              <PlayerMapGraph
                walletAddress={walletAddress}
                walletConnected={walletConnected}
                walletHooks={walletHooks}
                onOpenVoting={() => setIsVotingOpen(true)}
                constants={constants}
                gamesId={constants.COMMON_IDS.GAMES_ID}
                wagmiConfig={wagmiConfig}
              />
            )}
          </div>

          {/* Panneau speak-up — in-flow, s'anime en largeur */}
          {isWalletReady && hasConfirmedPlayer && (
            <VotingModal
              isOpen={isVotingOpen}
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              publicClient={wagmiConfig?.publicClient}
              wagmiConfig={wagmiConfig}
              onClose={() => setIsVotingOpen(false)}
              constants={constants}
            />
          )}
        </div>

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
      </div>
    </>
  );
};

// ✅ OPTIMISATION Sprint 2: Wrapper avec QueryClientProvider
const GraphComponent: React.FC<GraphComponentProps> = (props) => {
  return (
    <PlayerMapQueryClientProvider>
      <GraphComponentInner {...props} />
    </PlayerMapQueryClientProvider>
  );
};

export default GraphComponent;

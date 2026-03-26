import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Network } from "./hooks/useAtomData";
import { useTripleByCreator } from "./hooks/useTripleByCreator";
import { usePositions } from "./hooks/usePositions";
import { useSidebarData } from "./hooks/useSidebarData";
import { useSelectedAtomData } from "./hooks/useSelectedAtomData";
import { useSelectedAtomClaims } from "./hooks/useSelectedAtomClaims";
import PlayerMapHome from "./PlayerMapHome";
import PlayerMapGraph from "./PlayerMapGraph";
import { ConnectWalletModal } from "./components/modals";
import TopNavBar, { RightPanelMode, GraphControls } from "./components/TopNavBar";
import RightPanel from "./components/RightPanel";
import { PlayerMapQueryClientProvider } from "./contexts/QueryClientContext";
import {
  PlayerMapConfig,
  DefaultPlayerMapConstants,
} from "./types/PlayerMapConfig";
import { usePlayerConstants } from "./hooks/usePlayerConstants";
import initGraphql from "./config/graphql";
import IntuitionLogo from "./assets/img/Intuition-logo.svg";
import styles from "./GraphComponent.module.css";

interface GraphComponentProps {
  walletConnected?: any;
  walletAddress?: string;
  wagmiConfig?: any;
  walletHooks?: any;
  isOpen?: boolean;
  onClose?: () => void;
  onCreatePlayer?: () => void;
  onConnectWallet?: () => void;
  config?: PlayerMapConfig;
}

const GraphComponentInner: React.FC<GraphComponentProps> = ({
  walletConnected = false,
  walletAddress = "",
  wagmiConfig,
  walletHooks,
  onClose,
  onCreatePlayer,
  onConnectWallet,
  config,
}) => {
  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => { initGraphql(); }, []);

  const constants: DefaultPlayerMapConstants = usePlayerConstants(config);
  const [network] = useState<Network>(Network.MAINNET);

  // ── Wallet ────────────────────────────────────────────────────────────────────
  const [isWalletReady, setIsWalletReady] = useState(false);
  const lowerCaseAddress = walletAddress ?? "";

  useEffect(() => {
    setIsWalletReady(Boolean(walletAddress && walletAddress !== ""));
  }, [walletAddress]);

  // ── Player atom & positions ───────────────────────────────────────────────────
  const { loading: tripleLoading, error: tripleError, triples: playerTriplesRaw } =
    useTripleByCreator(
      lowerCaseAddress,
      constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId,
      constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId,
      network,
    );

  const { positions: activePositions, loading: positionsLoading } =
    usePositions(isWalletReady ? walletAddress : undefined, network);

  const playerTriples = useMemo(
    () => (playerTriplesRaw?.length ? [...playerTriplesRaw] : []),
    [playerTriplesRaw],
  );

  const hasPlayerAtom = playerTriples.length > 0;
  const hasActivePositions = activePositions.length > 0;
  const hasConfirmedPlayer = hasPlayerAtom && hasActivePositions;
  const isLoading = tripleLoading || positionsLoading;
  const hasError = tripleError;

  // ── Graph controls (remontés depuis GraphVisualization) ───────────────────────
  const [graphControls, setGraphControls] = useState<GraphControls | null>(null);

  // ── Mode du panneau droit ─────────────────────────────────────────────────────
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>("speakup");

  // ── Nœud sélectionné ─────────────────────────────────────────────────────────
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // ── Données sidebar "mon profil" ──────────────────────────────────────────────
  const {
    atomDetails: myAtomDetails,
    triples: myTriples,
    positions: myPositions,
    activities: myActivities,
    connections: myConnections,
    loading: sidebarLoading,
    error: sidebarError,
  } = useSidebarData(walletAddress, Network.MAINNET, constants);

  // ── Données atom sélectionné ──────────────────────────────────────────────────
  const { atomDetails: selectedAtomDetails, loading: selectedLoading, error: selectedError } =
    useSelectedAtomData(selectedNode, Network.MAINNET);

  const { claims: selectedClaims, loading: selectedClaimsLoading, error: selectedClaimsError } =
    useSelectedAtomClaims(selectedNode, Network.MAINNET);

  // ── Quand un nœud est cliqué → changer de mode ────────────────────────────────
  const handleNodeSelect = useCallback(
    (node: any) => {
      setSelectedNode(node);
      if (!node) return;
      // Si c'est le nœud de l'utilisateur → profil, sinon → atom
      const isMyNode =
        node?.id === myAtomDetails?.id || node?.id === myAtomDetails?.term_id;
      setRightPanelMode(isMyNode ? "profile" : "atom");
    },
    [myAtomDetails],
  );

  // ── Bouton profil dans la navbar change le mode ───────────────────────────────
  const handlePanelModeChange = useCallback((mode: RightPanelMode) => {
    setRightPanelMode(mode);
  }, []);

  // ── Inscription ───────────────────────────────────────────────────────────────
  const handleCreatePlayer = useCallback(() => {
    if (onCreatePlayer) onCreatePlayer();
  }, [onCreatePlayer]);

  const handleConnectWallet = useCallback(() => {
    if (onConnectWallet) onConnectWallet();
  }, [onConnectWallet]);

  // ── Erreur ────────────────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorTitle}>Error loading data</h2>
        <p className={styles.mutedText}>{(hasError as any).message || "An unexpected error occurred"}</p>
        <button onClick={() => window.location.reload()} className={styles.reloadBtn}>
          Reload page
        </button>
      </div>
    );
  }

  // ── Chargement ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.spinner} />
        <p className={styles.mutedText}>Loading player data…</p>
      </div>
    );
  }

  // ── Rendu principal ───────────────────────────────────────────────────────────
  return (
    <div className={styles.root}>

      {/* Modal connexion wallet */}
      <ConnectWalletModal isOpen={!isWalletReady} onConnectWallet={handleConnectWallet} />

      {/* Home / inscription — wallet non connecté ou pas encore de player */}
      {(!isWalletReady || (isWalletReady && !hasConfirmedPlayer)) && (
        <div className={!isWalletReady ? styles.homeBlurred : styles.homeVisible}>
          <PlayerMapHome
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            wagmiConfig={wagmiConfig}
            walletHooks={walletHooks}
            constants={constants}
            onCreatePlayer={handleCreatePlayer}
          />
        </div>
      )}

      {/* Layout principal : navbar + graphe + panneau ─────────────────────── */}
      {isWalletReady && hasConfirmedPlayer && (
        <div className={styles.mainLayout}>
          {/* Navbar fixe en haut */}
          <TopNavBar
            graphControls={graphControls}
            endpoint="base"
            rightPanelMode={rightPanelMode}
            onPanelModeChange={handlePanelModeChange}
            myAtomDetails={myAtomDetails}
          />

          {/* Corps : graphe (gauche) + panneau droit */}
          <div className={styles.body}>
            {/* Graphe — prend tout l'espace restant */}
            <div className={styles.graphPane}>
              <PlayerMapGraph
                walletAddress={walletAddress}
                constants={constants}
                gamesId={constants.COMMON_IDS.GAMES_ID}
                onNodeSelect={handleNodeSelect}
                onControlsReady={setGraphControls}
                onSpeakUpClick={() => handlePanelModeChange(rightPanelMode === "speakup" ? "atom" : "speakup")}
                isSpeakUpActive={rightPanelMode === "speakup"}
              />
            </div>

            {/* Panneau droit — largeur fixe, hauteur 100% du corps */}
            <div className={styles.rightPane}>
              <RightPanel
                mode={rightPanelMode}
                walletAddress={walletAddress}
                walletConnected={walletConnected}
                wagmiConfig={wagmiConfig}
                constants={constants}
                myAtomDetails={myAtomDetails}
                myTriples={myTriples}
                myPositions={myPositions}
                myActivities={myActivities}
                myConnections={myConnections}
                sidebarLoading={sidebarLoading}
                sidebarError={sidebarError}
                selectedAtomDetails={selectedAtomDetails}
                selectedClaims={selectedClaims}
                selectedLoading={selectedLoading || selectedClaimsLoading}
                selectedError={selectedError || selectedClaimsError}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Wrapper avec QueryClientProvider
const GraphComponent: React.FC<GraphComponentProps> = (props) => (
  <PlayerMapQueryClientProvider>
    <GraphComponentInner {...props} />
  </PlayerMapQueryClientProvider>
);

export default GraphComponent;

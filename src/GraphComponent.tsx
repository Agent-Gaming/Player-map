import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Network } from "./hooks/useAtomData";
import { usePositions } from "./hooks/usePositions";
import { useSidebarData } from "./hooks/useSidebarData";
import { useSelectedAtomData } from "./hooks/useSelectedAtomData";
import { useSelectedAtomClaims } from "./hooks/useSelectedAtomClaims";
import PlayerMapHome from "./PlayerMapHome";
import PlayerMapGraph from "./PlayerMapGraph";
import { ConnectWalletModal } from "./components/modals";
import TopNavBar, { RightPanelMode, GraphControls } from "./components/TopNavBar";
import RightPanel from "./components/RightPanel";
import { PlayerMapQueryClientProvider, useQueryClientContext } from "./contexts/QueryClientContext";
import {
  PlayerMapConfig,
  DefaultPlayerMapConstants,
} from "./types/PlayerMapConfig";
import { usePlayerConstants } from "./hooks/usePlayerConstants";
import initGraphql from "./config/graphql";
import { apiCache } from "./utils/apiCache";
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
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    setIsWalletReady(Boolean(walletAddress && walletAddress !== ""));
  }, [walletAddress]);

  // ── Player atom & positions ───────────────────────────────────────────────────
  const { positions: activePositions, loading: positionsLoading } =
    usePositions(isWalletReady ? walletAddress : undefined, network);

  // Detect "is player of Bossfighters" via a nested triple in active positions
  // (the subject of this triple is the alias triple, not an atom — creator_id is not accessible)
  const hasConfirmedPlayer = useMemo(
    () => {
      const match = activePositions.some((p: any) =>
        p.term?.triple?.predicate_id === constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId &&
        p.term?.triple?.object_id === constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId
      );
      console.log('[PlayerMap] hasConfirmedPlayer:', match);
      console.log('[PlayerMap] activePositions count:', activePositions.length);
      console.log('[PlayerMap] PLAYER_GAME predicateId:', constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId);
      console.log('[PlayerMap] PLAYER_GAME objectId:', constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId);
      console.log('[PlayerMap] positions with triples:', activePositions
        .filter((p: any) => p.term?.triple)
        .map((p: any) => ({ predicate_id: p.term.triple.predicate_id, object_id: p.term.triple.object_id }))
      );
      return match;
    },
    [activePositions, constants],
  );

  // Pendant le chargement des positions, on ne sait pas encore si le player est confirmé.
  // Si hasConfirmedPlayer=true, on attend aussi le sidebar pour savoir si l'alias existe.
  const isLoading = positionsLoading;
  const hasError = null;

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
  } = useSidebarData(walletAddress, Network.MAINNET);

  // Étend isLoading pour attendre le sidebar si le player est confirmé (évite flash du form)
  const isProfileLoading = hasConfirmedPlayer && sidebarLoading;
  // Accès complet au map : triple "is player of" + alias existant, ou juste après inscription
  const canAccessMap = justRegistered || (hasConfirmedPlayer && !!myAtomDetails);
  console.log('[PlayerMap] canAccessMap:', canAccessMap, '| myAtomDetails:', !!myAtomDetails, '| sidebarLoading:', sidebarLoading);

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

  // ── Invalidation cache après création du joueur ───────────────────────────────
  const queryClient = useQueryClientContext();
  const handleRegistrationComplete = useCallback(() => {
    apiCache.clear();
    queryClient.invalidateQueries({ queryKey: ['triplesByCreator'] });
    queryClient.invalidateQueries({ queryKey: ['positions'] });
    queryClient.invalidateQueries({ queryKey: ['aliasesByPosition'] });
    queryClient.invalidateQueries({ queryKey: ['triplesForAgent'] });
    setJustRegistered(true);
  }, [queryClient]);

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
  if (isLoading || isProfileLoading) {
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

      {/* Home / inscription — wallet non connecté, pas encore de player, ou profil incomplet */}
      {(!isWalletReady || (isWalletReady && !canAccessMap)) && (
        <div className={!isWalletReady ? styles.homeBlurred : styles.homeVisible}>
          <PlayerMapHome
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            wagmiConfig={wagmiConfig}
            walletHooks={walletHooks}
            constants={constants}
            hasConfirmedPlayer={hasConfirmedPlayer}
            onCreatePlayer={handleCreatePlayer}
            onRegistrationComplete={handleRegistrationComplete}
          />
        </div>
      )}

      {/* Layout principal : navbar + graphe + panneau ─────────────────────── */}
      {isWalletReady && canAccessMap && (
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

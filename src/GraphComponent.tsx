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
import RegistrationForm from "./RegistrationForm";
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

interface GraphComponentProps {
  walletConnected?: boolean;
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
  const [isRegistrationFormOpen, setIsRegistrationFormOpen] = useState(false);

  const handleCreatePlayer = useCallback(() => {
    if (onCreatePlayer) onCreatePlayer();
    setIsRegistrationFormOpen(true);
  }, [onCreatePlayer]);

  const handleCloseRegistrationForm = useCallback(() => {
    setIsRegistrationFormOpen(false);
    if (onClose) onClose();
  }, [onClose]);

  const handleConnectWallet = useCallback(() => {
    if (onConnectWallet) onConnectWallet();
  }, [onConnectWallet]);

  // ── Erreur ────────────────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", flexDirection: "column", gap: 20 }}>
        <h2 style={{ color: "red", textAlign: "center" }}>Error loading data</h2>
        <p style={{ textAlign: "center", color: "#666" }}>{(hasError as any).message || "An unexpected error occurred"}</p>
        <button onClick={() => window.location.reload()} style={{ padding: "10px 20px", backgroundColor: "#FFD32A", color: "#000", border: "none", borderRadius: 5, cursor: "pointer" }}>
          Reload page
        </button>
      </div>
    );
  }

  // ── Chargement ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", flexDirection: "column", gap: 20 }}>
        <div style={{ width: 50, height: 50, border: "4px solid #FFD32A", borderTop: "4px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ textAlign: "center", color: "#666" }}>Loading player data…</p>
      </div>
    );
  }

  // ── Rendu principal ───────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>

      {/* Modal connexion wallet */}
      <ConnectWalletModal isOpen={!isWalletReady} onConnectWallet={handleConnectWallet} />

      {/* Home / inscription — wallet non connecté ou pas encore de player */}
      {(!isWalletReady || (isWalletReady && !hasConfirmedPlayer)) && (
        <div style={{ filter: !isWalletReady ? "blur(3px)" : "none", opacity: !isWalletReady ? 0.7 : 1 }}>
          <PlayerMapHome
            walletConnected={isWalletReady}
            walletAddress={walletAddress}
            wagmiConfig={wagmiConfig}
            walletHooks={walletHooks}
            onCreatePlayer={handleCreatePlayer}
          />
        </div>
      )}

      {/* ── Layout principal : navbar + graphe + panneau ─────────────────────── */}
      {isWalletReady && hasConfirmedPlayer && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* Navbar fixe en haut */}
          <TopNavBar
            graphControls={graphControls}
            endpoint="base"
            rightPanelMode={rightPanelMode}
            onPanelModeChange={handlePanelModeChange}
            myAtomDetails={myAtomDetails}
          />

          {/* Corps : graphe (gauche) + panneau droit */}
          <div
            style={{
              display: "flex",
              flex: 1,
              minHeight: 0,
              width: "100%",
              overflow: "hidden",
            }}
          >
            {/* Graphe — prend tout l'espace restant */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                height: "100%",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <PlayerMapGraph
                walletAddress={walletAddress}
                constants={constants}
                gamesId={constants.COMMON_IDS.GAMES_ID}
                onNodeSelect={handleNodeSelect}
                onControlsReady={setGraphControls}
                onSpeakUpClick={() => handlePanelModeChange(rightPanelMode === "speakup" ? "atom" : "speakup")}
                isSpeakUpActive={rightPanelMode === "speakup"}
              />

              {/* Logo Intuition centré sous le bouton Speak Up */}
              <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", opacity: 0.35, zIndex: 10, pointerEvents: "none" }}>
                <a href="https://portal.intuition.systems/" target="_blank" rel="noopener noreferrer" style={{ pointerEvents: "auto" }}>
                  <img src={IntuitionLogo} alt="Intuition Systems" style={{ height: 26, width: "auto" }} />
                </a>
              </div>
            </div>

            {/* Panneau droit — largeur fixe, hauteur 100% du corps */}
            <div
              style={{
                width: "50%",
                height: "100%",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
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

      {/* Formulaire d'inscription */}
      <RegistrationForm
        isOpen={isRegistrationFormOpen}
        onClose={handleCloseRegistrationForm}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        wagmiConfig={wagmiConfig}
        walletHooks={walletHooks}
        constants={constants}
      />
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

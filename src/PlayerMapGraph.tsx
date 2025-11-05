import React, { useState, useEffect } from "react";
import { GraphVisualization, LoadingAnimation } from "playermap_graph";
import {
  SidebarDrawer,
  AtomDetailsSection,
  ClaimsSection,
  PositionsSection,
  ActivitySection,
} from "./components/graph";
import { FaUser, FaVoteYea } from "react-icons/fa";
import Atom from "./assets/img/atom.svg";
import IntuitionLogo from "./assets/img/Intuition-logo.svg";
import { useSidebarData } from "./hooks/useSidebarData";
import { useSelectedAtomData } from "./hooks/useSelectedAtomData";
import { useSelectedAtomClaims } from "./hooks/useSelectedAtomClaims";
import { Network } from "./hooks/useAtomData";
import { DefaultPlayerMapConstants } from "./types/PlayerMapConfig";

interface PlayerMapGraphProps {
  walletAddress?: string;
  walletConnected?: any;
  walletHooks?: any;
  onOpenVoting?: () => void; // Callback pour ouvrir la modal depuis GraphComponent
  constants: DefaultPlayerMapConstants; // Constantes injectées directement
  gamesId?: string; // GAMES_ID pour playermap-graph
  wagmiConfig?: any; // Ajouter wagmiConfig
}

// Définir les types pour les props des composants
interface GraphVisualizationProps {
  endpoint: string;
  onNodeSelect: (node: any) => void;
  onLoadingChange: (isLoading: boolean) => void;
  walletAddress?: string;
  gamesId?: string;
  disableNodeDetailsSidebar?: boolean;
}

interface LoadingAnimationProps {}

const PlayerMapGraph: React.FC<PlayerMapGraphProps> = ({
  walletAddress,
  walletConnected,
  walletHooks,
  onOpenVoting,
  constants,
  gamesId,
  wagmiConfig,
}) => {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isMyNode, setIsMyNode] = useState(false); // Nouvel état pour différencier mon atom vs autre

  // Wrapper pour setSelectedNode
  const handleSetSelectedNode = (node: any) => {
    setSelectedNode(node);
  };
  const [selectedEndpoint, setSelectedEndpoint] = useState("base"); // TODO: change to mainnet
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered, setHovered] = useState("");

  // Handler pour le vote avec fallback sécurisé
  const handleVoteClick = () => {
    if (onOpenVoting) {
      onOpenVoting();
    } else {
      console.warn("onOpenVoting not provided to PlayerMapGraph");
    }
  };

  // Charger les données de la sidebar (pour mon atom)
  const {
    atomDetails: myAtomDetails,
    triples,
    positions,
    activities,
    connections,
    loading: sidebarLoading,
    error: sidebarError,
  } = useSidebarData(walletAddress, Network.MAINNET, constants);

  // Charger les données de l'atom sélectionné
  const {
    atomDetails: selectedAtomDetails,
    loading: selectedLoading,
    error: selectedError,
  } = useSelectedAtomData(selectedNode, Network.MAINNET);

  // Charger les claims de l'atom sélectionné
  const {
    claims: selectedClaims,
    loading: selectedClaimsLoading,
    error: selectedClaimsError,
  } = useSelectedAtomClaims(selectedNode, Network.MAINNET);

  // Détecter quand un node est sélectionné et vérifier si c'est le node de l'utilisateur
  useEffect(() => {
    if (selectedNode && myAtomDetails) {
      // Vérifier si c'est le node de l'utilisateur
      const isMyNode =
        selectedNode?.id === myAtomDetails?.id ||
        selectedNode?.id === myAtomDetails?.term_id;

      if (isMyNode) {
        // Ouvrir la sidebar seulement si c'est le node de l'utilisateur
        setIsMyNode(true);
        setSidebarOpen(true);
      } else {
        setIsMyNode(false);
        setSidebarOpen(true); // Ouvrir sidebar pour autre atom aussi
      }
    }
  }, [selectedNode, myAtomDetails]);

  // Styles identiques à NavigationBar.jsx
  const navBtnStyle = {
    background: "#ffd32a",
    color: "#18181b",
    border: "none",
    borderRadius: 12,
    width: 54,
    height: 54,
    fontSize: 22,
    fontWeight: "bold" as const,
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    cursor: "pointer",
    marginBottom: 0,
    marginTop: 0,
    textTransform: "uppercase" as const,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 0,
    transition: "background 0.2s, color 0.2s, transform 0.1s",
  };

  const navBtnHoverStyle = {
    background: "#ffe066",
    color: "#18181b",
    transform: "translateY(-2px) scale(1.03)",
  };

  const getBtnStyle = (key: string) =>
    hovered === key ? { ...navBtnStyle, ...navBtnHoverStyle } : navBtnStyle;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Visualisation du graphe */}
      <div
        style={{
          position: "relative",
          flex: 1,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <GraphVisualization
          endpoint={selectedEndpoint}
          onNodeSelect={handleSetSelectedNode}
          onLoadingChange={setIsLoading}
          walletAddress={walletAddress}
          gamesId={gamesId}
          disableNodeDetailsSidebar={true}
        />
      </div>

      {/* Animation de chargement */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2,
          }}
        >
          <LoadingAnimation />
        </div>
      )}

      {/* Bouton "My View" en haut à gauche */}
      <div
        style={{
          position: "absolute",
          top: "5px",
          left: "5px",
          zIndex: 50,
          display: "flex",
          flexDirection: "row",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <button
          style={getBtnStyle("profile")}
          onClick={() => {
            setIsMyNode(true); // Forcer mode "my view"
            setSidebarOpen(true);
          }}
          aria-label="Profile"
          onMouseEnter={() => setHovered("profile")}
          onMouseLeave={() => setHovered("")}
        >
          <FaUser />
        </button>
      </div>

      {/* Bouton "Vote" */}
      <div
        style={{
          position: "absolute",
          bottom: "50%",
          right: "5px",
          zIndex: 50,
        }}
      >
        <button
          style={{
            ...getBtnStyle("vote"),
            fontSize: "18px",
            fontWeight: "bolder",
            width: "auto",
            minWidth: "160px",
            padding: "0 12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onClick={handleVoteClick}
          aria-label="Vote"
          onMouseEnter={() => setHovered("vote")}
          onMouseLeave={() => setHovered("")}
        >
          <img src={Atom} alt="Atom" style={{ width: "44px" }} />
          SPEAK UP
        </button>
      </div>

      {/* Logo Intuition en bas à gauche */}
      <div
        style={{
          position: "absolute",
          bottom: "5px",
          left: "5px",
          opacity: 0.4,
          zIndex: 50,
        }}
      >
        <a
          href="https://portal.intuition.systems/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            textDecoration: "none",
            transition: "opacity 0.2s, transform 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.8";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <img
            src={IntuitionLogo}
            alt="Intuition Systems"
            style={{
              height: "30px",
              width: "auto",
              cursor: "pointer",
            }}
          />
        </a>
      </div>

      {/* Overlay pour le clic en dehors de la sidebar */}
      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1200,
            pointerEvents: "auto",
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SidebarDrawer migré de playermap-graph */}
      <SidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        {(sidebarLoading || selectedLoading || selectedClaimsLoading) && (
          <p>Loading data...</p>
        )}

        {(sidebarError || selectedError || selectedClaimsError) && (
          <p style={{ color: "red" }}>
            Error : {sidebarError || selectedError || selectedClaimsError}
          </p>
        )}

        {!sidebarLoading &&
          !sidebarError &&
          !selectedLoading &&
          !selectedError &&
          !selectedClaimsLoading &&
          !selectedClaimsError && (
            <>
              <AtomDetailsSection
                atomDetails={isMyNode ? myAtomDetails : selectedAtomDetails}
                connections={
                  isMyNode ? connections : { follows: [], followers: [] }
                }
                walletAddress={walletAddress}
              />

              {/* Afficher les claims pour tous les atoms */}
              <ClaimsSection
                activities={isMyNode ? activities : selectedClaims}
                title={isMyNode ? "My Claims" : "Claims"}
                walletAddress={walletAddress}
                walletConnected={walletConnected}
                publicClient={wagmiConfig?.publicClient}
              />

              {/* Afficher les autres sections seulement si c'est mon atom */}
              {isMyNode && (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  <div style={{ width: '48%' }}>
                    <PositionsSection
                      accountId={walletAddress || ""}
                      walletConnected={walletConnected}
                      walletAddress={walletAddress}
                    />
                  </div>
                  <div style={{ width: '48%' }}>
                    <ActivitySection accountId={walletAddress || ""} />
                  </div>
                </div>
              )}
            </>
          )}
      </SidebarDrawer>
    </div>
  );
};

export default PlayerMapGraph;

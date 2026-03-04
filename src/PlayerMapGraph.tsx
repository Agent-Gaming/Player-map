import React, { useState } from "react";
import { GraphVisualization } from "playermap_graph";
import { DefaultPlayerMapConstants } from "./types/PlayerMapConfig";
import Atom from "./assets/img/atom.svg";

interface GraphControls {
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  resetGraph: () => void;
  isSearching: boolean;
  handleSearch?: (...args: any[]) => any;
  handleSearchStart?: () => void;
}

interface PlayerMapGraphProps {
  walletAddress?: string;
  constants: DefaultPlayerMapConstants;
  gamesId?: string;
  /** Callback déclenché quand un nœud du graphe est cliqué */
  onNodeSelect?: (node: any) => void;
  /** Remonte les contrôles de navigation au composant parent */
  onControlsReady?: (controls: GraphControls) => void;
  /** Ouvre le panneau SpeakUp */
  onSpeakUpClick?: () => void;
  /** Mode actif du panneau droit (pour highlight du bouton) */
  isSpeakUpActive?: boolean;
}

const PlayerMapGraph: React.FC<PlayerMapGraphProps> = ({
  walletAddress,
  constants,
  gamesId,
  onNodeSelect,
  onControlsReady,
  onSpeakUpClick,
  isSpeakUpActive = false,
}) => {
  const [hovered, setHovered] = useState(false);

  const btnStyle: React.CSSProperties = {
    background: isSpeakUpActive ? "#ffd42a" : "#ffd32a",
    color: "#18181b",
    borderRadius: 12,
    padding: "0 18px",
    height: 50,
    fontSize: 16,
    fontWeight: "bolder" as const,
    letterSpacing: "0.05em",
    boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    transition: "background 0.15s, transform 0.1s",
    transform: hovered ? "translateY(-2px) scale(1.03)" : "none",
    outline: "none",
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <GraphVisualization
        endpoint="base"
        onNodeSelect={onNodeSelect}
        onLoadingChange={() => {}}
        walletAddress={walletAddress}
        gamesId={gamesId}
        disableNodeDetailsSidebar={true}
        hideNavigationBar={true}
        onControlsReady={onControlsReady}
      />

      {/* Bouton SPEAK UP — overlay centré en bas du graphe */}
      {onSpeakUpClick && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
        >
          <button
            style={btnStyle}
            onClick={onSpeakUpClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            aria-label="Speak Up"
          >
            <img src={Atom} alt="" style={{ width: 32, pointerEvents: "none" }} />
            SPEAK UP
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerMapGraph;

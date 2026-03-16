import React from "react";
import { GraphVisualization } from "playermap_graph";
import { DefaultPlayerMapConstants } from "./types/PlayerMapConfig";
import Atom from "./assets/img/atom.svg";
import styles from "./PlayerMapGraph.module.css";

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

  return (
    <div className={styles.wrapper}>
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
        <div className={styles.speakUpOverlay}>
          <button
            className={`${styles.speakUpBtn} ${isSpeakUpActive ? styles.speakUpBtnActive : ''}`}
            onClick={onSpeakUpClick}
            aria-label="Speak Up"
          >
            <img src={Atom} alt="" className={styles.speakUpIcon} />
            SPEAK UP
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerMapGraph;

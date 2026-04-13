import React, { useMemo } from "react";
import { GraphVisualization } from "playermap_graph";
import { useGameContext } from "./contexts/GameContext";
import { PREDICATES } from "./utils/constants";
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
  /** Callback déclenché quand un nœud du graphe est cliqué */
  onNodeSelect?: (node: any) => void;
  /** Remonte les contrôles de navigation au composant parent */
  onControlsReady?: (controls: GraphControls) => void;
  /** Ouvre le panneau SpeakUp */
  onSpeakUpClick?: () => void;
  /** Mode actif du panneau droit (pour highlight du bouton) */
  isSpeakUpActive?: boolean;
}

const COMMON_IDS = {
  IS:           PREDICATES.IS,
  IS_PLAYER_OF: PREDICATES.IS_PLAYER_OF,
  IN:           PREDICATES.IN,
  HAS_ALIAS:    PREDICATES.HAS_ALIAS,
  IS_MEMBER_OF: PREDICATES.IS_MEMBER_OF,
};

const PlayerMapGraph: React.FC<PlayerMapGraphProps> = ({
  walletAddress,
  onNodeSelect,
  onControlsReady,
  onSpeakUpClick,
  isSpeakUpActive = false,
}) => {
  const { activeGame } = useGameContext()
  const gamesId = activeGame?.atomId

  // Build fetchTriplesForPlayerMap constants from GameContext.
  // NOTE: activeGame.claims contains triple term_ids (PREDEFINED_CLAIM_IDS),
  //       not atom IDs for IS-predicate filtering.
  const graphConstants = useMemo(() => {
    if (!activeGame) return null;

    const PLAYER_TRIPLE_TYPES: Record<string, any> = {
      PLAYER_GAME: {
        predicateId: PREDICATES.IS_PLAYER_OF,
        objectId: activeGame.atomId,
      },
      PLAYER_QUALITY_1: {
        predicateId: PREDICATES.IS,
        objectId: '0xe8c70540064241818928054f9d655b79a9fc06fad93967db766347d9ed678795', // fairplay atom
      },
      PLAYER_QUALITY_IN: {
        predicateId: PREDICATES.IN,
        objectId: activeGame.atomId, // quality IN BossFighters
      },
      GAME_CREATED_BY: {
        subjectId: activeGame.atomId, // BossFighters → created by → ...
        predicateId: PREDICATES.CREATED_BY,
        objectId: null,
      },
      PLAYER_GUILD: {
        predicateId: PREDICATES.IS_MEMBER_OF,
        objectId: null, // handled via OFFICIAL_GUILDS loop
      },
    };

    const OFFICIAL_GUILDS = activeGame.guilds.map(g => ({ id: g.atomId }));

    // claims are triple term_ids fetched directly by term_id
    const PREDEFINED_CLAIM_IDS = activeGame.claims.map(c => c.atomId);

    return {
      COMMON_IDS,
      PLAYER_TRIPLE_TYPES,
      OFFICIAL_GUILDS,
      PREDEFINED_CLAIM_IDS,
    };
  }, [activeGame]);

  return (
    <div className={styles.wrapper}>
      <GraphVisualization
        endpoint="base"
        onNodeSelect={onNodeSelect}
        onLoadingChange={() => {}}
        walletAddress={walletAddress}
        gamesId={gamesId}
        config={graphConstants ? { constants: graphConstants } : undefined}
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

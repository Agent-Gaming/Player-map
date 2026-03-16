import React from "react";
import { ClaimVoting } from "./ClaimVoting";
import { SpeakUpHeader } from "./SpeakUpHeader";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import { Network } from "../../hooks/useAtomData";
import { useGameStats } from "../../hooks/useGameStats";
import styles from "./VotingModal.module.css";

interface VotingModalProps {
  isOpen: boolean;
  walletConnected: any;
  walletAddress?: string;
  publicClient?: any;
  onClose: () => void;
  constants: DefaultPlayerMapConstants;
  wagmiConfig?: any;
}

const PANEL_WIDTH = "720px";

/**
 * Panneau latéral droit pour le système de vote — s'affiche à côté du graphe (in-flow)
 */
const VotingModal: React.FC<VotingModalProps> = ({
  isOpen,
  walletConnected,
  walletAddress,
  publicClient,
  onClose,
  constants,
  wagmiConfig,
}) => {
  const stats = useGameStats(constants, Network.MAINNET);

  return (
    <div
      className={styles.panel}
      style={{
        width: isOpen ? PANEL_WIDTH : 0,
        minWidth: isOpen ? PANEL_WIDTH : 0,
        borderLeft: isOpen ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
        boxShadow: isOpen ? "-4px 0 24px rgba(0, 0, 0, 0.4)" : "none",
      }}
    >
      {isOpen && (
        <div
          className={styles.innerPanel}
          style={{ width: PANEL_WIDTH }}
        >
          {/* Header avec stats globales du jeu */}
          <SpeakUpHeader stats={stats} />

          {/* Contenu de vote — flex:1, overflow hidden pour que la liste interne gère son propre scroll */}
          <div className={styles.content}>
            <ClaimVoting
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              publicClient={publicClient}
              onClose={onClose}
              network={Network.MAINNET}
              wagmiConfig={wagmiConfig}
              constants={constants}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingModal;

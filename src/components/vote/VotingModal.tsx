import React from "react";
import { ClaimVoting } from "./ClaimVoting";
import { SpeakUpHeader } from "./SpeakUpHeader";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import { Network } from "../../hooks/useAtomData";
import { useGameStats } from "../../hooks/useGameStats";

interface VotingModalProps {
  isOpen: boolean;
  walletConnected: any;
  walletAddress?: string;
  publicClient?: any;
  onClose: () => void;
  constants: DefaultPlayerMapConstants;
  wagmiConfig?: any;
}

const PANEL_WIDTH = "640px";

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
      style={{
        width: isOpen ? PANEL_WIDTH : 0,
        minWidth: isOpen ? PANEL_WIDTH : 0,
        height: "100%",
        overflow: "hidden",
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        borderLeft: isOpen ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
        boxShadow: isOpen ? "-4px 0 24px rgba(0, 0, 0, 0.4)" : "none",
        transition: "width 0.35s cubic-bezier(0.4, 1.1, 0.5, 1), min-width 0.35s cubic-bezier(0.4, 1.1, 0.5, 1)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {isOpen && (
        <div
          style={{
            width: PANEL_WIDTH,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header avec stats globales du jeu */}
          <SpeakUpHeader stats={stats} />

          {/* Contenu de vote — scrollable */}
          <div style={{ flex: 1, overflowY: "auto" }}>
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

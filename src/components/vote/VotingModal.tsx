import React from "react";
import { ClaimVoting } from "./ClaimVoting";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import { Network } from "../../hooks/useAtomData";

interface VotingModalProps {
  isOpen: boolean;
  walletConnected: any;
  walletAddress?: string;
  publicClient?: any;
  onClose: () => void;
  constants: DefaultPlayerMapConstants; // Constantes injectées directement
  wagmiConfig?: any;
}

/**
 * Panneau latéral droit pour le système de vote — s'affiche à côté du graphe
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
  return (
    <div
      style={{
        flexShrink: 0,
        width: isOpen ? "520px" : 0,
        height: "100%",
        overflow: "hidden",
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        borderLeft: isOpen ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
        boxShadow: isOpen ? "-4px 0 24px rgba(0, 0, 0, 0.4)" : "none",
        transition: "width 0.35s cubic-bezier(0.4, 1.1, 0.5, 1)",
        zIndex: 10,
      }}
    >
      {isOpen && (
        <div style={{ width: "520px", height: "100%", overflow: "auto" }}>
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
      )}
    </div>
  );
};

export default VotingModal;

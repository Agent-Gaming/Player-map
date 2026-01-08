import React, { useEffect } from "react";
import { ClaimVoting } from "./ClaimVoting";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import { Network } from "../../hooks/useAtomData";

interface VotingModalProps {
  walletConnected: any;
  walletAddress?: string;
  publicClient?: any;
  onClose: () => void;
  constants: DefaultPlayerMapConstants; // Constantes injectées directement
  wagmiConfig?: any;
}

/**
 * Modal component for the voting system using ClaimVoting
 */
const VotingModal: React.FC<VotingModalProps> = ({
  walletConnected,
  walletAddress,
  publicClient,
  onClose,
  constants,
  wagmiConfig,
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div
      style={{
        zIndex: 1000,
        position: "fixed",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        inset: "10px 0px 0px 0px",
      }}
    >
      <div
        style={{
          width: "75%",
          height: "90%",
          overflow: "hidden",
          borderRadius: "18px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
        }}
      >
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
  );
};

export default VotingModal;

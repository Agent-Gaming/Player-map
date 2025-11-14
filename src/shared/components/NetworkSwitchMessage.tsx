import React from "react";

interface NetworkSwitchMessageProps {
  currentChainId: number | null;
  targetChainId: number;
  allowedChainIds?: number[];
}

export const NetworkSwitchMessage = ({
  currentChainId,
  targetChainId,
  allowedChainIds = [1155],
}: NetworkSwitchMessageProps) => {
  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1155:
        return "Intuition Mainnet";
      default:
        return `Chain ID: ${chainId}`;
    }
  };

  return (
    <div
      style={{
        padding: "15px",
        backgroundColor: "#2e2e40",
        borderRadius: "8px",
        margin: "10px 0",
        textAlign: "center",
      }}
    >
      <p style={{ color: "#ff4444", marginBottom: "10px" }}>
        You are not on the correct network
      </p>
      <p style={{ color: "#aaa", fontSize: "0.9em", marginBottom: "10px" }}>
        Current network:{" "}
        {currentChainId ? getNetworkName(currentChainId) : "Not connected"}
        <br />
        Required network: {getNetworkName(1155)}
      </p>
      <p style={{ color: "#fff", fontSize: "0.9em" }}>
        Please switch to Intuition Mainnet (1155) in your wallet to continue
      </p>
    </div>
  );
};

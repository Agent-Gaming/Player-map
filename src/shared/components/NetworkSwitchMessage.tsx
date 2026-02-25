import React from "react";

interface NetworkSwitchMessageProps {
  currentChainId: number | null;
  targetChainId: number;
  allowedChainIds?: number[];
}

export const NetworkSwitchMessage = ({
  currentChainId,
  targetChainId,
  allowedChainIds = [1155]
}: NetworkSwitchMessageProps) => {
  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1155:
        return 'Intuition MainNet';
      default:
        return `Chain ID: ${chainId}`;
    }
  };

  return (
    <div style={{
      padding: '0px 10px',
      margin: '10px 0',
      textAlign: 'center',
    }}>
      <p style={{ color: '#ff4444' }}>
        You are not on the correct network : Current network: {currentChainId ? getNetworkName(currentChainId) : 'Not connected'} - Required network: {getNetworkName(targetChainId)} <br />
        Please switch to Intuition MainNet (1155) in your wallet to continue
      </p>
    </div>
  );
};

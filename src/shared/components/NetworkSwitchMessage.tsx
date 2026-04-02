import React, { useState } from "react";

interface NetworkSwitchMessageProps {
  currentChainId: number | null;
  targetChainId: number;
  allowedChainIds?: number[];
  onSwitchNetwork?: () => Promise<void>;
}

export const NetworkSwitchMessage = ({
  currentChainId,
  targetChainId,
  allowedChainIds = [1155],
  onSwitchNetwork
}: NetworkSwitchMessageProps) => {
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1155:
        return 'Intuition MainNet';
      default:
        return `Chain ID: ${chainId}`;
    }
  };

  const handleSwitch = async () => {
    if (!onSwitchNetwork) return;
    setSwitching(true);
    setError(undefined);
    try {
      await onSwitchNetwork();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch network');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div style={{
      padding: '16px',
      margin: '16px 0',
      textAlign: 'center',
      backgroundColor: '#1a1a1a',
      borderRadius: '4px',
      border: '1px solid #ff4444',
    }}>
      <p style={{ color: '#ff4444', marginBottom: '12px' }}>
        Current network: {currentChainId ? getNetworkName(currentChainId) : 'Not connected'} <br />
        Required network: {getNetworkName(targetChainId)}
      </p>
      {onSwitchNetwork && (
        <button
          onClick={handleSwitch}
          disabled={switching}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ffed4e',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: switching ? 'not-allowed' : 'pointer',
            opacity: switching ? 0.6 : 1,
          }}
        >
          {switching ? 'Switching...' : `Switch to ${getNetworkName(targetChainId)}`}
        </button>
      )}
      {error && (
        <p style={{ color: '#ff8888', marginTop: '12px', fontSize: '0.9em' }}>
          Error: {error}
        </p>
      )}
    </div>
  );
};

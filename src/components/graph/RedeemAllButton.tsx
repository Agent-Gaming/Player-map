import React from "react";

interface RedeemAllButtonProps {
  selectedCount: number;
  onRedeemAll: () => void;
  isLoading: boolean;
}

const RedeemAllButton: React.FC<RedeemAllButtonProps> = ({ 
  selectedCount, 
  onRedeemAll, 
  isLoading 
}) => {
  if (selectedCount === 0) return null;

  return (
    <button
      onClick={onRedeemAll}
      disabled={isLoading}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        backgroundColor: isLoading ? '#374151' : '#ffd32a',
        color: isLoading ? '#9ca3af' : '#000',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: isLoading ? 'not-allowed' : 'pointer',
      }}
    >
      {isLoading ? 'Redeeming...' : `Redeem (${selectedCount})`}
    </button>
  );
};

export default RedeemAllButton;

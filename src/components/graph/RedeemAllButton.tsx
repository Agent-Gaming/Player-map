import React from "react";
import styles from "./Positions.module.css";

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
      className={styles.redeemAllBtn}
    >
      {isLoading ? 'Redeeming...' : `Redeem (${selectedCount})`}
    </button>
  );
};

export default RedeemAllButton;

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
  const isDisabled = isLoading || selectedCount === 0;

  return (
    <button
      onClick={onRedeemAll}
      disabled={isDisabled}
      className={styles.redeemAllBtn}
    >
      {isLoading ? 'REDEEMING...' : `REDEEM (${selectedCount})`}
    </button>
  );
};

export default RedeemAllButton;

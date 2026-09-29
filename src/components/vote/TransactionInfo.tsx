import React from "react";
import { calculateEthCost, calculateGasCost } from "../../utils/voteUtils";
import styles from "./VoteComponents.module.css";

interface TransactionInfoProps {
  numberOfTransactions: number;
  totalUnits: number;
  onResetAll: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isDepositLoading: boolean;
}

export const TransactionInfo: React.FC<TransactionInfoProps> = ({
  numberOfTransactions,
  totalUnits,
  onResetAll,
  onSubmit,
  isSubmitting,
  isDepositLoading,
}) => {
  const isProcessing = isSubmitting || isDepositLoading;
  const canSubmit = totalUnits > 0 && !isProcessing;

  return (
    <div className={styles.txInfo}>
      {/* Stats */}
      <div className={styles.txInfoStats}>
        <div className={styles.voteTotalContainer}>
          <div className={styles.txStatLabel}>
            Your Votes :
          </div>
          <div className={styles.txStatValue}>
            {numberOfTransactions}
          </div>
        </div>

       {/* Total Trust TX ----------------------
        <div>
          <div className={styles.txStatLabel}>
            Total $TRUST
          </div>
          <div className={styles.txStatValue}>
            {calculateEthCost(totalUnits)}
          </div>
        </div>
       */}
      </div>

      {/* Buttons */}
      <div className={styles.txInfoBtns}>
        <button
          onClick={onResetAll}
          disabled={totalUnits === 0}
          className={styles.txBtnReset}
        >
          ↺
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={styles.txBtnSubmit}
        >
          {isProcessing ? "Processing..." : "Validate"} ✔
        </button>
      </div>
    </div>
  );
}; 
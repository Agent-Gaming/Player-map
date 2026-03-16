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
        <div>
          <div className={styles.txStatLabel}>
            Position(s) selected
          </div>
          <div className={styles.txStatValue}>
            {numberOfTransactions}
          </div>
        </div>

        <div>
          <div className={styles.txStatLabel}>
            Total $TRUST
          </div>
          <div className={styles.txStatValue}>
            {calculateEthCost(totalUnits)}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className={styles.txInfoBtns}>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={styles.txBtn}
        >
          ✔ {isProcessing ? "Processing..." : "SUBMIT"}
        </button>

        <button
          onClick={onResetAll}
          disabled={totalUnits === 0}
          className={styles.txBtn}
        >
          ↺ RESET
        </button>
      </div>
    </div>
  );
}; 
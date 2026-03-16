import React from "react";
import { calculateEthCost } from "../../utils/voteUtils";
import styles from "./VoteComponents.module.css";

interface SubmitButtonProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  isDepositLoading: boolean;
  totalUnits: number;
  numberOfTransactions: number;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  onSubmit,
  isSubmitting,
  isDepositLoading,
  totalUnits,
  numberOfTransactions,
}) => {
  return (
    <div className={styles.submitWrapper}>
      <div className={styles.submitHint}>
        {numberOfTransactions > 0 && `You will initiate ${numberOfTransactions} transaction${numberOfTransactions > 1 ? 's' : ''}`}
      </div>
      
      <button
        onClick={onSubmit}
        disabled={isSubmitting || isDepositLoading || totalUnits === 0}
        className={styles.submitBtn}
      >
        {isSubmitting || isDepositLoading
          ? "Processing..." 
          : totalUnits > 0 ? `Submit votes (${calculateEthCost(totalUnits)} TRUST)` : "Submit votes"}
      </button>
    </div>
  );
}; 
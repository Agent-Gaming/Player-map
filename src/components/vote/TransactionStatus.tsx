import React from "react";
import styles from "./VoteComponents.module.css";

type TransactionStatusType = {
  status: "idle" | "pending" | "success" | "error" | "approval_pending" | "whitelist_error";
  message: string;
};

interface TransactionStatusDisplayProps {
  transactionStatus: TransactionStatusType;
}

export const TransactionStatusDisplay: React.FC<TransactionStatusDisplayProps> = ({
  transactionStatus,
}) => {
  if (transactionStatus.status === "idle" || transactionStatus.status === "whitelist_error") {
    return null;
  }

  const statusClass = {
    pending: styles.txStatusPending,
    approval_pending: styles.txStatusApprovalPending,
    success: styles.txStatusSuccess,
    error: styles.txStatusError,
  }[transactionStatus.status] ?? styles.txStatusPending;

  return (
    <div className={`${styles.txStatus} ${statusClass}`}>
      <div>
        {transactionStatus.message}
      </div>
    </div>
  );
}; 
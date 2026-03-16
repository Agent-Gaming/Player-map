import React from "react";
import styles from "./VoteComponents.module.css";

interface VotingHeaderProps {
  onClose?: () => void;
}

export const VotingHeader: React.FC<VotingHeaderProps> = ({ onClose }) => {
  return (
    <div className={styles.header}>
      <h2 className={styles.headerTitle}>
        VOTE ON CLAIMS
      </h2>

      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={styles.closeBtn}
          aria-label="Close voting modal"
        >
          ×
        </button>
      )}
    </div>
  );
}; 
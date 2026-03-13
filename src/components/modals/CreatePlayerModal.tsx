import React from "react";
import styles from "./CreatePlayerModal.module.css";

interface CreatePlayerModalProps {
  isOpen: boolean;
  onCreatePlayer: () => void;
  onClose?: () => void;
}

export const CreatePlayerModal: React.FC<CreatePlayerModalProps> = ({
  isOpen,
  onCreatePlayer,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {onClose && (
          <button
            onClick={onClose}
            className={styles.closeBtn}
          >
            ×
          </button>
        )}
        <h2 className={styles.title}>Player Required</h2>
        <p className={styles.subtitle}>
          You need to create a player before you can vote on claims
        </p>
        <button
          onClick={onCreatePlayer}
          className={styles.btn}
        >
          Create Player
        </button>
      </div>
    </div>
  );
}; 
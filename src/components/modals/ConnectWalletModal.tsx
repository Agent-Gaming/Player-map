import React from "react";
import styles from "./ConnectWalletModal.module.css";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onConnectWallet: () => void;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onConnectWallet,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>Wallet Required</h2>
        <p className={styles.subtitle}>
          Please connect your wallet to access this feature
        </p>
        <button
          onClick={onConnectWallet}
          className={styles.btn}
        >
          Connect Wallet
        </button>
      </div>
    </div>
  );
}; 
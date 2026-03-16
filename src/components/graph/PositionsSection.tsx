import React, { useState, useEffect } from "react";
import {
  PositionCard,
  RedeemAllButton,
} from "./index";
import { fetchPositions } from "../../api/fetchPositions";
import { useRedeemAmounts } from "../../hooks/useRedeemAmounts";
import { useRedeemExecution } from "../../hooks/useRedeemExecution";
import styles from "./Positions.module.css";

interface PositionsSectionProps {
  accountId: string;
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
}

const PositionsSection: React.FC<PositionsSectionProps> = ({
  accountId,
  walletConnected,
  walletAddress,
  publicClient,
}) => {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);

  const {
    selectedPositions,
    redeemAmounts,
    handlePositionSelect,
    handleAmountChange,
    clearSelection,
  } = useRedeemAmounts();
  const { handleRedeemAllSelected, isLoading } = useRedeemExecution({
    walletConnected,
    walletAddress,
  });

  const loadPositions = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const positionsData = await fetchPositions(accountId);
      setPositions(positionsData);
    } catch (error) {
      console.error("Error loading positions:", error);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, [accountId]);

  const onRedeemAllSelected = async () => {
    const result = await handleRedeemAllSelected(
      positions,
      selectedPositions,
      redeemAmounts,
      accountId
    );
    if (result?.success) {
      clearSelection();
      // Refresh positions après redemption
      setIsReloading(true);
      await loadPositions();
      setIsReloading(false);
    }
  };

  return (
    <div>
      {isReloading && (
        <p className={styles.stateMessageRefreshing}>Refreshing positions…</p>
      )}
      {loading ? (
        <p className={styles.stateMessage}>Loading…</p>
      ) : positions.length === 0 ? (
        <p className={styles.stateMessage}>No positions found.</p>
      ) : (
        <>
          {positions.map((position, index) => (
            <PositionCard
              key={position.id || index}
              position={position}
              isSelected={selectedPositions.has(position.id)}
              onSelect={handlePositionSelect}
              onAmountChange={handleAmountChange}
              redeemAmount={redeemAmounts[position.id]}
              publicClient={publicClient}
            />
          ))}

          {selectedPositions.size > 0 && (
            <div className={styles.stickyFooter}>
              <RedeemAllButton
                selectedCount={selectedPositions.size}
                onRedeemAll={onRedeemAllSelected}
                isLoading={isLoading}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PositionsSection;

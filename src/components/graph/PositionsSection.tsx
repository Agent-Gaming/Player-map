import React, { useState, useEffect } from "react";
import {
  PositionCard,
  Pagination,
  PaginationInfo,
  RedeemAllButton,
} from "./index";
import { fetchPositions } from "../../api/fetchPositions";
import { useRedeemAmounts } from "../../hooks/useRedeemAmounts";
import { useRedeemExecution } from "../../hooks/useRedeemExecution";

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

  useEffect(() => {
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
    loadPositions();
  }, [accountId]);

  const onRedeemAllSelected = async () => {
    const result = await handleRedeemAllSelected(
      positions,
      selectedPositions,
      redeemAmounts,
      accountId
    );
    if (result?.success) clearSelection();
  };

  const totalPages = Math.ceil(positions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPositions = positions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div>
      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13, padding: "8px 0" }}>Loading…</p>
      ) : positions.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: 13, padding: "8px 0" }}>No positions found.</p>
      ) : (
        <>
          {currentPositions.map((position, index) => (
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

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            flexWrap: "wrap",
            gap: 8,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 10,
          }}>
            <PaginationInfo
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={positions.length}
            />
            <RedeemAllButton
              selectedCount={selectedPositions.size}
              onRedeemAll={onRedeemAllSelected}
              isLoading={isLoading}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={positions.length}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PositionsSection;

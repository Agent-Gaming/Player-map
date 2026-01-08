import React, { useState, useEffect } from "react";
import {
  PositionCard,
  Pagination,
  PaginationInfo,
  RedeemAllButton,
} from "./index";
import Modal from "./Modal";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

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
    if (result?.success) {
      clearSelection();
    }
  };

  if (loading) {
    return (
      <div>
        <h3>My Positions</h3>
        <p>Loading positions...</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          background: "#ffd32a",
          color: "#000",
          border: "none",
          borderRadius: "8px",
          padding: "12px 24px",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          transition: "all 0.2s",
          width: "100%",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#ffed4e";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#ffd32a";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        My Positions ({positions.length})
      </button>

      {/* Modal pour afficher toutes les positions */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentPage(1); // Reset à la page 1 quand on ferme
        }}
        title={`My Positions (${positions.length})`}
      >
        <div style={{ padding: "0" }}>
          {(() => {
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const currentPositions = positions.slice(startIndex, endIndex);

            return currentPositions.map((position, index) => (
              <div
                style={{ padding: "8px 24px 8px" }}
                key={position.id || index}
              >
                <PositionCard
                  key={position.id || index}
                  position={position}
                  isSelected={selectedPositions.has(position.id)}
                  onSelect={handlePositionSelect}
                  onAmountChange={handleAmountChange}
                  redeemAmount={redeemAmounts[position.id]}
                  publicClient={publicClient}
                />
              </div>
            ));
          })()}

          {/* Footer fixe */}
          <div
            style={{
              borderTop: "1px solid #374151",
              padding: "16px 24px",
              backgroundColor: "#18181b",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "sticky",
              bottom: 0,
              zIndex: 10,
            }}
          >
            {/* Info à gauche */}
            <div>
              <PaginationInfo
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={positions.length}
              />
            </div>

            {/* Bouton Redeem All Selected au centre */}
            <div>
              <RedeemAllButton
                selectedCount={selectedPositions.size}
                onRedeemAll={onRedeemAllSelected}
                isLoading={isLoading}
              />
            </div>

            {/* Pagination à droite */}
            <div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(positions.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={positions.length}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PositionsSection;

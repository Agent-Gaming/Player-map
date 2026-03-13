import React, { useState, useRef } from 'react';
import Modal from './Modal';
import Pagination from './Pagination';
import PaginationInfo from './PaginationInfo';
import { TripleBubble, PositionBubble } from './index';
import ClaimDepositControls from './ClaimDepositControls';
import { useDepositTriple } from '../../hooks/useDepositTriple';
import { VoteDirection } from '../../types/vote';
import styles from './ClaimsModal.module.css';

interface ClaimsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: any[];
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
}

const ClaimsModal: React.FC<ClaimsModalProps> = ({ 
  isOpen, 
  onClose, 
  activities, 
  walletAddress, 
  walletConnected, 
  publicClient 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClaims, setSelectedClaims] = useState<Record<string, { trust: number; direction: 'for' | 'against' }>>({});
  const [isDepositing, setIsDepositing] = useState(false);
  const itemsPerPage = 10;
  
  const { depositTriple } = useDepositTriple({
    walletConnected,
    walletAddress,
    publicClient
  });

  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = activities.slice(startIndex, endIndex);

  const handleClose = () => {
    onClose();
    setCurrentPage(1); // Reset à la page 1 quand on ferme
    setSelectedClaims({}); // Reset selections
  };

  // Handle claim selection
  const handleClaimSelection = (claimId: string, trust: number, direction: 'for' | 'against' | 'neutral') => {
    if (direction === 'neutral' || trust === 0) {
      const newSelections = { ...selectedClaims };
      delete newSelections[claimId];
      setSelectedClaims(newSelections);
    } else {
      setSelectedClaims(prev => ({
        ...prev,
        [claimId]: { trust, direction }
      }));
    }
  };

  // Handle deposit all selected
  const handleDepositAll = async () => {
    const selectedCount = Object.keys(selectedClaims).length;
    if (selectedCount === 0) return;

    setIsDepositing(true);
    try {
      const votes = Object.entries(selectedClaims).map(([claimId, selection]) => ({
        claimId,
        units: selection.trust * 100,
        direction: selection.direction === 'for' ? VoteDirection.For : VoteDirection.Against
      }));

      const result = await depositTriple(votes);
      
      if (result.success) {
        setSelectedClaims({}); // Clear selections
        // Optionally close modal or show success message
      } else {
        console.error('❌ Deposit failed:', result.error);
        // Show error message to user
      }
    } catch (error) {
      console.error('❌ Deposit error:', error);
    } finally {
      setIsDepositing(false);
    }
  };

  const selectedCount = Object.keys(selectedClaims).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`All Claims (${activities.length})`}
    >
      <div className={styles.body}>
        <div className={styles.claimList}>
          {currentActivities.map((claim) => (
            <div
              key={claim.term_id}
              className={styles.claimItem}
            >
              <div className={styles.claimRow}>
                {/* Triple linéaire : predicate → object */}
                <div className={styles.tripleArea}>
                  <TripleBubble
                    subject=""
                    predicate={claim.predicate.label}
                    object={claim.object.label}
                    fontSize="12px"
                    showArrows={false}
                  />
                </div>

                {/* Positions For/Against */}
                <div className={styles.positionsArea}>
                  <PositionBubble 
                    isFor={true} 
                    count={claim.term?.positions_aggregate?.aggregate?.count || 0}
                    fontSize="12px"
                    showCount={true}
                  />
                  <PositionBubble 
                    isFor={false} 
                    count={claim.counter_term?.positions_aggregate?.aggregate?.count || 0}
                    fontSize="12px"
                    showCount={true}
                  />
                </div>
              </div>
              
              {/* Deposit Controls */}
              <div className={styles.depositArea}>
                <ClaimDepositControls
                  claim={claim}
                  walletAddress={walletAddress}
                  walletConnected={walletConnected}
                  publicClient={publicClient}
                  onSelectionChange={(trust, direction) => 
                    handleClaimSelection(claim.term_id, trust, direction)
                  }
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer fixe */}
        <div className={styles.footer}>
          {/* Info à gauche */}
          <div>
            <PaginationInfo
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={activities.length}
            />
          </div>
          
          {/* Bouton Deposit All Selected au centre */}
          {selectedCount > 0 && (
            <div className={styles.depositAllCenter}>
              <button
                onClick={handleDepositAll}
                disabled={isDepositing}
                className={styles.depositAllBtn}
              >
                {isDepositing ? 'Processing...' : `Deposit All Selected (${selectedCount})`}
              </button>
            </div>
          )}
          
          {/* Pagination à droite */}
          <div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={activities.length}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ClaimsModal;

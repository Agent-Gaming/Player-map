import React, { useState } from 'react';
import ClaimsModal from './ClaimsModal';
import { TripleBubble, PositionBubble } from './index';

interface ClaimsSectionProps {
  activities: any[];
  title?: string;
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
}

const ClaimsSection: React.FC<ClaimsSectionProps> = ({ 
  activities, 
  title = "My Claims", 
  walletAddress, 
  walletConnected, 
  publicClient 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{width: "100%", display: 'flex', flexWrap: 'wrap' }}>
      <h3 style={{ width:'100%', margin:'0px' }}>{title} ({activities.length})</h3>
      {activities.length > 0 ? (
        <div style={{ width: '100%', overflowY: 'auto' }}>
          {activities.slice(0, 3).map((claim) => (
            <div
              key={claim.term_id}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px' ,
                overflow: 'hidden',
                marginBottom: '2px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  gap: '12px',
                }}
              >
                {/* Triple linéaire : predicate → object */}
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '8px' }}>
                <TripleBubble
                  subject=""
                  predicate={String(claim.predicate?.label ?? '')}
                  object={String(claim.object?.label ?? '')}
                  fontSize="12px"
                  showArrows={false}
                />
                </div>

                {/* Positions For/Against */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            </div>
          ))}
          {activities.length > 3 && (
            <div 
              style={{
                padding: '12px',
                textAlign: 'center',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontStyle: 'italic',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onClick={() => setIsModalOpen(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
            >
              Show all {activities.length} claims
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>No claim found</p>
      )}

      {/* Modal pour afficher tous les claims */}
      <ClaimsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activities={activities}
        walletAddress={walletAddress}
        walletConnected={walletConnected}
        publicClient={publicClient}
      />
    </div>
  );
};

export default ClaimsSection;
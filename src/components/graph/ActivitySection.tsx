import React, { useState, useEffect } from 'react';
import { ActivityCard, Pagination, PaginationInfo } from './index';
import Modal from './Modal';
import { fetchActivityHistory } from '../../api/fetchActivityHistory';

interface ActivitySectionProps {
  accountId: string;
}

const ActivitySection: React.FC<ActivitySectionProps> = ({ accountId }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadActivityHistory = async () => {
      if (!accountId) return;
      
      setLoading(true);
      try {
        const activityData = await fetchActivityHistory(accountId);
        setActivities(activityData);
      } catch (error) {
        console.error('Error loading activity history:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    loadActivityHistory();
  }, [accountId]);

  if (loading) {
    return (
      <div>
        <h3>Activity History</h3>
        <p>Loading activities...</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          background: '#ffd429',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.2s',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#ffed4e';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffd32a';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        Activity History ({activities.length})
      </button>

      {/* Modal pour afficher toutes les activités */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentPage(1); // Reset à la page 1 quand on ferme
        }}
        title={`Activity History (${activities.length})`}
      >
        <div style={{ padding: '0' }}>
          {(() => {
            const totalPages = Math.ceil(activities.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const currentActivities = activities.slice(startIndex, endIndex);
            
            return (
              <>
                <div style={{ padding: '16px 24px 16px' }}>
                  {currentActivities.map((activity, index) => (
                    <ActivityCard key={activity.id || index} activity={activity} />
                  ))}
                </div>
                
                {/* Footer fixe */}
                <div style={{ 
                  borderTop: '1px solid #374151', 
                  padding: '16px 24px',
                  backgroundColor: '#18181b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 10
                }}>
                  {/* Info à gauche */}
                  <div>
                    <PaginationInfo
                      currentPage={currentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={activities.length}
                    />
                  </div>
                  
                  {/* Pagination au centre */}
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
              </>
            );
          })()}
        </div>
      </Modal>
    </div>
  );
};

export default ActivitySection;


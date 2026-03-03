import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityCard, Pagination, PaginationInfo } from './index';
import { fetchActivityHistory } from '../../api/fetchActivityHistory';

interface ActivitySectionProps {
  accountId: string;
}

const ActivitySection: React.FC<ActivitySectionProps> = ({ accountId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { data: activities = [], isLoading: loading } = useQuery({
    queryKey: ['activityHistory', accountId],
    queryFn: () => fetchActivityHistory(accountId),
    enabled: Boolean(accountId),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentActivities = activities.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div>
      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13, padding: "8px 0" }}>Loading…</p>
      ) : activities.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: 13, padding: "8px 0" }}>No activity found.</p>
      ) : (
        <>
          {currentActivities.map((activity, index) => (
            <ActivityCard key={activity.id || index} activity={activity} />
          ))}

          {totalPages > 1 && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
              flexWrap: "wrap",
              gap: 6,
            }}>
              <PaginationInfo
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={activities.length}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={activities.length}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivitySection;


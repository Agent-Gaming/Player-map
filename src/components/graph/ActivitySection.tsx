import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityCard } from './index';
import { fetchActivityHistory } from '../../api/fetchActivityHistory';

interface ActivitySectionProps {
  accountId: string;
}

const ActivitySection: React.FC<ActivitySectionProps> = ({ accountId }) => {
  const { data: activities = [], isLoading: loading } = useQuery({
    queryKey: ['activityHistory', accountId],
    queryFn: () => fetchActivityHistory(accountId),
    enabled: Boolean(accountId),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  return (
    <div>
      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13, padding: "8px 0" }}>Loading…</p>
      ) : activities.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: 13, padding: "8px 0" }}>No activity found.</p>
      ) : (
        activities.map((activity: any, index: number) => (
          <ActivityCard key={activity.id || index} activity={activity} />
        ))
      )}
    </div>
  );
};

export default ActivitySection;


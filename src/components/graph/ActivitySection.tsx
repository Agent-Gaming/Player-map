import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityCard } from './index';
import { fetchActivityHistory } from '../../api/fetchActivityHistory';
import styles from './ActivitySection.module.css';

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
        <p className={styles.stateMessage}>Loading…</p>
      ) : activities.length === 0 ? (
        <p className={styles.stateMessage}>No activity found.</p>
      ) : (
        activities.map((activity: any, index: number) => (
          <ActivityCard key={activity.id || index} activity={activity} />
        ))
      )}
    </div>
  );
};

export default ActivitySection;


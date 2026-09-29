import React from 'react';
import { FaLock, FaCheck } from 'react-icons/fa';
import type { Mission, MissionStatus } from '../../types/Missions';
import styles from './ClaimButton.module.css';

interface ClaimButtonProps {
  status: MissionStatus;
  missionType: Mission['type'];
  onClaim: () => void;
  link?: string;
}

const ClaimButton: React.FC<ClaimButtonProps> = ({ status, missionType, onClaim, link }) => {
  if (status === 'in_progress') {
    return null;
  }

  if (status === 'claimed') {
    return (
      <button type="button" className={styles.claimed} disabled>
        <FaCheck className={styles.checkIcon} />
        Claimed
      </button>
    );
  }

  if (status === 'locked') {
    return (
      <button type="button" className={styles.locked} disabled>
        <FaLock className={styles.lockIcon} />
        Locked
      </button>
    );
  }

  // status === 'claimable'
  if (missionType === 'social') {
    return (
      <button
        type="button"
        className={styles.action}
        onClick={(e) => {
          e.stopPropagation(); // archetype/global cards open a modal on click — don't also trigger that
          if (link) window.open(link, '_blank', 'noopener,noreferrer');
        }}
      >
        Link
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.action}
      onClick={(e) => {
        e.stopPropagation(); // archetype card opens the archetype modal on click — don't also trigger that
        onClaim();
      }}
    >
      Claim
    </button>
  );
};

export default ClaimButton;

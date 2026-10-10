import React, { useEffect, useState } from 'react';
import { FaClock, FaGlobe, FaUsers, FaTimes, FaFire } from 'react-icons/fa';
import { useMissions } from '../missions/shared/useMissions';
import { useClaimMission } from '../missions/shared/useClaimMission';
import { ClaimError } from '../missions/shared/claimApi';
import MissionRow from '../missions/shared/MissionRow';
import ProgressBar from '../missions/shared/ProgressBar';
import type { Mission } from '../types/Missions';
import styles from './MissionsExpanded.module.css';

type MissionCategory = 'daily' | 'global' | 'social';

interface MissionsExpandedProps {
  isOpen: boolean;
  initialCategory: MissionCategory;
  walletAddress?: string;
  getAccessToken?: () => Promise<string | null>;
  onOpenQuestModal?: (missionId: string) => void;
  onClose: () => void;
}

const CATEGORIES: Array<{ key: MissionCategory; title: string; emptyLabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'daily', title: 'Daily', emptyLabel: 'No daily mission right now.', icon: FaClock },
  { key: 'global', title: 'Global', emptyLabel: 'No global mission right now.', icon: FaGlobe },
  { key: 'social', title: 'Social', emptyLabel: 'No social mission right now.', icon: FaUsers },
];

const MissionsExpanded: React.FC<MissionsExpandedProps> = ({
  isOpen,
  initialCategory,
  walletAddress,
  getAccessToken,
  onOpenQuestModal,
  onClose,
}) => {
  const { grouped, totalXp, categoryXp, isLoading, error } = useMissions(walletAddress);
  const claimMutation = useClaimMission({ address: walletAddress, getAccessToken });

  const [activeCategory, setActiveCategory] = useState<MissionCategory>(initialCategory);

  // Re-sync the pre-selected category every time the popup is (re)opened —
  // "See more" on a given block must always land on that block's category,
  // even if the popup was left on a different one last time it was open.
  useEffect(() => {
    if (isOpen) setActiveCategory(initialCategory);
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleClaim = (mission: Mission) => {
    claimMutation.mutate(mission.id);
  };

  const pendingMissionId = claimMutation.isPending ? claimMutation.variables : undefined;

  const claimErrorStatus =
    claimMutation.isError && claimMutation.error instanceof ClaimError ? claimMutation.error.status : undefined;
  const isStaleClaim = claimErrorStatus === 409;

  const errorMissionId = claimMutation.isError && !isStaleClaim ? claimMutation.variables : undefined;
  const errorMessage = claimMutation.isError ? claimMutation.error.message : undefined;

  const dailyLoginStreak = grouped.daily.find((m) => m.id === 'daily-login' && m.type === 'daily')?.streak;

  const activeMissions = grouped[activeCategory];
  const activeCategoryMeta = CATEGORIES.find((c) => c.key === activeCategory)!;
  const activeCategoryXp = categoryXp[activeCategory];
  const ActiveIcon = activeCategoryMeta.icon;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.corePopUp}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>MISSION &amp; QUEST</span>
          <div className={styles.headerRight}>
            <span className={styles.headerXp}>{totalXp} XP</span>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <FaTimes style={{ width: 14, height: 14, flexShrink: 0 }} />
            </button>
          </div>
        </div>

        {isLoading && <p className={styles.status}>Loading missions...</p>}
        {error && <p className={styles.status}>Failed to load missions.</p>}

        {!isLoading && !error && (
          <div className={styles.body}>
            <div className={styles.categoryColumn}>
              {CATEGORIES.map(({ key, title, icon: Icon }) => {
                const missions = grouped[key];
                const claimedCount = missions.filter((m) => m.status === 'claimed').length;
                const isActive = key === activeCategory;

                return (
                  <button
                    type="button"
                    key={key}
                    className={[styles.categoryCard, isActive ? styles.categoryCardActive : ''].join(' ')}
                    onClick={() => setActiveCategory(key)}
                  >
                    <div className={styles.categoryCardTop}>
                      <span className={styles.categoryIcon} style={{ color: `var(--color-${key})` }}>
                        <Icon className={styles.categoryIconSvg} />
                      </span>
                      <span className={styles.categoryTitle}>{title}</span>
                      {key === 'daily' && !!dailyLoginStreak && (
                        <span className={styles.streakBadge}>
                          <FaFire className={styles.streakIcon} /> {dailyLoginStreak}
                        </span>
                      )}
                    </div>
                    <ProgressBar current={claimedCount} target={Math.max(missions.length, 1)} colorVariant={key} />
                  </button>
                );
              })}
            </div>

            <div className={styles.missionColumn}>
              <div className={styles.missionColumnHeader}>
                <span className={styles.missionColumnIcon} style={{ color: `var(--color-${activeCategory})` }}>
                  <ActiveIcon className={styles.missionColumnIconSvg} />
                </span>
                <span className={styles.missionColumnTitle}>{activeCategoryMeta.title}</span>
                {activeCategory === 'daily' && !!dailyLoginStreak && (
                  <span className={styles.streakBadge}>
                    <FaFire className={styles.streakIcon} /> {dailyLoginStreak}
                  </span>
                )}
                <span className={styles.missionColumnXp}>{activeCategoryXp} XP</span>
              </div>

              <div className={styles.missionList}>
                {activeMissions.length === 0 && (
                  <p className={styles.emptyState}>{activeCategoryMeta.emptyLabel}</p>
                )}
                {activeMissions.map((mission) => (
                  <div
                    key={mission.id}
                    style={pendingMissionId === mission.id ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
                  >
                    <MissionRow
                      mission={mission}
                      status={mission.status}
                      onClaim={() => handleClaim(mission)}
                      onOpenQuestModal={onOpenQuestModal}
                      walletAddress={walletAddress}
                    />
                    {errorMissionId === mission.id && (
                      <p className={styles.claimError}>{errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default MissionsExpanded;

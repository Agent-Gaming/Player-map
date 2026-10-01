import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaClock, FaFire } from 'react-icons/fa';
import { useMissions } from '../missions/shared/useMissions';
import { useClaimMission } from '../missions/shared/useClaimMission';
import { ClaimError } from '../missions/shared/claimApi';
import MissionCard from '../missions/shared/MissionCard';
import type { Mission } from '../types/Missions';
import MissionsExpanded from './MissionsExpanded';
import styles from './MissionsSimple.module.css';
import UserIcon from './img/user-icon.png';
import ClosePanel from './img/close-panel.png';
import OpenPanel from './img/open-panel.png';

const PANEL_STORAGE_KEY = 'playermap_missionsPanelOpen';

type MissionCategory = 'daily' | 'global' | 'social';

interface MissionsSimpleProps {
  walletAddress?: string;
  getAccessToken?: () => Promise<string | null>;
  onOpenQuestModal?: (missionId: string) => void;
}

interface MissionBlockProps {
  title: string;
  colorVariant: MissionCategory;
  missions: Mission[];
  earnedXp: number;
  emptyLabel: string;
  onClaim: (mission: Mission) => void;
  pendingMissionId?: string;
  errorMissionId?: string;
  errorMessage?: string;
  errorIsRateLimit?: boolean;
  onOpenQuestModal?: (missionId: string) => void;
  onSeeMore: (category: MissionCategory) => void;
  streak?: number;
  walletAddress?: string;
}

const MissionBlock: React.FC<MissionBlockProps> = ({
  title,
  colorVariant,
  missions,
  earnedXp,
  emptyLabel,
  onClaim,
  pendingMissionId,
  errorMissionId,
  errorMessage,
  errorIsRateLimit,
  onOpenQuestModal,
  onSeeMore,
  streak,
  walletAddress,
}) => {
  const [expanded, setExpanded] = useState(true);

  // Panel is a preview: show the first not-yet-claimed mission (existing
  // order), or the last one (claimed, greyed) if the whole group is done —
  // never an empty block when missions actually exist.
  const visibleMission = missions.length === 0 ? undefined : (missions.find((m) => m.status !== 'claimed') ?? missions[missions.length - 1]);

  return (
    <div className={styles.block}>
    
        <div className={styles.headerMissionBlock}>
        <span className={styles.blockTitle}>
          <span className={styles.blockDot} style={{ backgroundColor: `var(--color-${colorVariant})` }} />
          {title}
        </span>
        <span className={styles.blockHeaderRight}>
          {!!streak && (
            <span className={styles.streakBadge}>
              <FaFire className={styles.streakIcon} /> {streak}
            </span>
          )}
        </span>

        </div>


        <div className={styles.blockContent}>
          {!visibleMission && <p className={styles.emptyState}>{emptyLabel}</p>}
          {visibleMission && (
            <div
              key={visibleMission.id}
              style={pendingMissionId === visibleMission.id ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            >
              <MissionCard
                mission={visibleMission}
                status={visibleMission.status}
                onClaim={() => onClaim(visibleMission)}
                onOpenQuestModal={onOpenQuestModal}
                walletAddress={walletAddress}
              />
              {errorMissionId === visibleMission.id && (
                <p className={errorIsRateLimit ? styles.claimRateLimit : styles.claimError}>
                  {errorIsRateLimit && <FaClock className={styles.rateLimitIcon} />}
                  {errorMessage}
                </p>
              )}
            </div>
          )}
          <div className={styles.dashedLine} />
          <button
            type="button"
            className={styles.seeMoreBtn}
            onClick={(e) => {
              e.stopPropagation();
              onSeeMore(colorVariant);
            }}
          >
            See more
          </button>
        </div>

    </div>
  );
};

const MissionsSimple: React.FC<MissionsSimpleProps> = ({ walletAddress, getAccessToken, onOpenQuestModal }) => {
  const [open, setOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem(PANEL_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  const { grouped, totalXp, categoryXp, isLoading, error } = useMissions(walletAddress);
  const claimMutation = useClaimMission({ address: walletAddress, getAccessToken });

  const [expandedOpen, setExpandedOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<MissionCategory>('daily');

  const handleSeeMore = (category: MissionCategory) => {
    setExpandedCategory(category);
    setExpandedOpen(true);
  };

  const togglePanel = () => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(PANEL_STORAGE_KEY, String(next));
      return next;
    });
  };

  const closePanel = () => {
    setOpen(false);
    localStorage.setItem(PANEL_STORAGE_KEY, 'false');
  };

  const handleClaim = (mission: Mission) => {
    claimMutation.mutate(mission.id);
  };

  const pendingMissionId = claimMutation.isPending ? claimMutation.variables : undefined;

  // 409 (stale claimed state) is self-healing: onError already refetches, and
  // once that lands the mission's real status flips to 'claimed' and the
  // button re-renders as CLAIMED on its own — no error text needed for it.
  const claimErrorStatus =
    claimMutation.isError && claimMutation.error instanceof ClaimError ? claimMutation.error.status : undefined;
  const isStaleClaim = claimErrorStatus === 409;

  const errorMissionId = claimMutation.isError && !isStaleClaim ? claimMutation.variables : undefined;
  const errorMessage = claimMutation.isError ? claimMutation.error.message : undefined;
  const errorIsRateLimit = claimErrorStatus === 429;

  const dailyLoginStreak = grouped.daily.find((m) => m.id === 'daily-login' && m.type === 'daily')?.streak;

  return (
    <div className={styles.wrapper}>
      {!open && (
  <button
    type="button"
    className={styles.toggleHandle}
    onClick={togglePanel}
    aria-label="Expand missions panel"
  >
     <div className={styles.openButtonPanelContainer}>
       <img
  src={OpenPanel}
  alt="open Panel"
  className={styles.openButtonPanelIcon}
  width={12}
  height={12}
/>
</div>
  </button>
)}

<div className={`${styles.content} ${!open ? styles.contentClosed : ''}`}>
        {open && (
          <div className={styles.inner}>
            <div className={styles.header}>
            <span className={styles.headerTitle}>
  Missions
  <button
    type="button"
    onClick={closePanel}
    aria-label="Close Missions Panel"
    className={styles.closeButtonPanel}
  >
    <div className={styles.closeButtonPanelContainer}>
    <img
  src={ClosePanel}
  alt="Close Panel"
  className={styles.closeButtonPanelIcon}
  width={12}
  height={12}
/>
    </div>
  </button>
</span>
              <span className={styles.labelMissions}>Complete missions, earn XP, and make progress every day.</span>
            </div>

            <div className={styles.totalXp}>
              <span className={styles.headerTitleXP}>Total XP Points</span>
              <span className={styles.headerXp}>{totalXp}</span>
              <div className={styles.rangUser}>
                <img src={UserIcon} alt="User Icon" className={styles.userIcon} />
                <span className={styles.labelUserName}>Omiage</span>
                <span className={styles.labelUserRank}>#354</span>
              </div>
            </div>

            {isLoading && <p className={styles.status}>Loading missions...</p>}
            {error && <p className={styles.status}>Failed to load missions.</p>}

            {!isLoading && !error && (
              <>
                <MissionBlock
                  title="Daily"
                  colorVariant="daily"
                  missions={grouped.daily}
                  earnedXp={categoryXp.daily}
                  emptyLabel="No daily mission right now."
                  onClaim={handleClaim}
                  pendingMissionId={pendingMissionId}
                  errorMissionId={errorMissionId}
                  errorMessage={errorMessage}
                  errorIsRateLimit={errorIsRateLimit}
                  onOpenQuestModal={onOpenQuestModal}
                  onSeeMore={handleSeeMore}
                  streak={dailyLoginStreak}
                  walletAddress={walletAddress}
                />
                <MissionBlock
                  title="Global"
                  colorVariant="global"
                  missions={grouped.global}
                  earnedXp={categoryXp.global}
                  emptyLabel="No global mission right now."
                  onClaim={handleClaim}
                  pendingMissionId={pendingMissionId}
                  errorMissionId={errorMissionId}
                  errorMessage={errorMessage}
                  errorIsRateLimit={errorIsRateLimit}
                  onOpenQuestModal={onOpenQuestModal}
                  onSeeMore={handleSeeMore}
                  walletAddress={walletAddress}
                />
                <MissionBlock
                  title="Social"
                  colorVariant="social"
                  missions={grouped.social}
                  earnedXp={categoryXp.social}
                  emptyLabel="No social mission right now."
                  onClaim={handleClaim}
                  pendingMissionId={pendingMissionId}
                  errorMissionId={errorMissionId}
                  errorMessage={errorMessage}
                  errorIsRateLimit={errorIsRateLimit}
                  onOpenQuestModal={onOpenQuestModal}
                  onSeeMore={handleSeeMore}
                />
              </>
            )}
          </div>
        )}
      </div>

      <MissionsExpanded
        isOpen={expandedOpen}
        initialCategory={expandedCategory}
        walletAddress={walletAddress}
        getAccessToken={getAccessToken}
        onOpenQuestModal={onOpenQuestModal}
        onClose={() => setExpandedOpen(false)}
      />
    </div>
  );
};

export default MissionsSimple;

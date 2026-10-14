import React, { useMemo } from "react";
import { PublicCampaign } from "../../hooks/useCampaigns";
import styles from "./CampaignTabs.module.css";

interface CampaignTabsProps {
  campaigns: PublicCampaign[];
  selectedCampaignId: string | null;
  onSelect: (id: string) => void;
}

// One tab per campaign/version, always shown (even for a single campaign) —
// replaces the old CampaignList two-screen nav (list -> detail -> back).
export const CampaignTabs: React.FC<CampaignTabsProps> = ({
  campaigns,
  selectedCampaignId,
  onSelect,
}) => {
  // Active (can vote now) first, then upcoming Draft campaigns, each group
  // ordered by sequence_number — status takes priority over version order so
  // the one you can actually act on is never buried to the right.
  const statusOrder: Record<string, number> = { Active: 0, Draft: 1 };
  const sorted = useMemo(
    () =>
      [...campaigns].sort((a, b) => {
        const statusDelta = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
        return statusDelta !== 0 ? statusDelta : a.sequence_number - b.sequence_number;
      }),
    [campaigns]
  );

  return (
    <div className={styles.tabsRow}>
      <div className={styles.tabs}>
        {sorted.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`${styles.tab} ${c.id === selectedCampaignId ? styles.tabActive : ""}`}
            onClick={() => onSelect(c.id)}
          >
            <span>v{c.game_version}</span>
            {c.status === "Active" ? (
              <span className={styles.liveTag}>
                <span className="pm-live-dot" /> Live
              </span>
            ) : (
              <span className={styles.soonTag}>Soon</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

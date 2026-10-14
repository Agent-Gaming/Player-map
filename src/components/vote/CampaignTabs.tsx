import React, { useMemo } from "react";
import { PublicCampaign } from "../../hooks/useCampaigns";
import { Countdown } from "./Countdown";
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
  const sorted = useMemo(
    () => [...campaigns].sort((a, b) => a.sequence_number - b.sequence_number),
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
              <Countdown targetDate={c.start_date} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

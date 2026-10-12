import React from "react";
import { PublicCampaign } from "../../hooks/useCampaigns";
import { DEV_STEP_LABEL, DEV_STEP_COLOR } from "../../config/devStep";
import { Countdown } from "./Countdown";
import styles from "./CampaignList.module.css";

interface CampaignListProps {
  campaigns: PublicCampaign[];
  onSelect: (id: string) => void;
}

export const CampaignList: React.FC<CampaignListProps> = ({ campaigns, onSelect }) => {
  return (
    <div className={styles.list}>
      {campaigns.map((c) => (
        <button key={c.id} type="button" className={styles.row} onClick={() => onSelect(c.id)}>
          <div className={styles.rowTop}>
            <span
              className={styles.devStepBadge}
              style={{
                color: DEV_STEP_COLOR[c.dev_step],
                borderColor: `${DEV_STEP_COLOR[c.dev_step]}40`,
                background: `${DEV_STEP_COLOR[c.dev_step]}14`,
              }}
            >
              {DEV_STEP_LABEL[c.dev_step]}
            </span>
            <span className={styles.gameVersion}>v{c.game_version} #{c.sequence_number}</span>
            {c.status === "Active" ? (
              <span className={styles.liveTag}>
                <span className="pm-live-dot" /> Live
              </span>
            ) : (
              <Countdown targetDate={c.start_date} />
            )}
          </div>
          {c.description && <p className={styles.description}>{c.description}</p>}
        </button>
      ))}
    </div>
  );
};

import React, { useMemo } from "react";
import { VoteItem, VoteDirection } from "../../types/vote";
import { ClaimItem } from "./ClaimItem";
import { Network } from "../../hooks/useAtomData";
import { getAtomVerificationStatus } from "../../config/verifiedAtoms";
import SafeImage from "../SafeImage";
import styles from "./CampaignGroupedList.module.css";

interface CampaignGroupedListProps {
  isLoading: boolean;
  voteItems: VoteItem[];
  onChangeUnits: (id: bigint, direction: VoteDirection, units: number) => void;
  isVoteDirectionAllowed?: (
    tripleId: bigint,
    direction: VoteDirection
  ) => boolean;
  walletAddress?: string;
  network?: Network;
}

// Campaign tab only — groups objects under a single subject header instead
// of ClaimList's flat rows. Each row still renders the same ClaimItem used
// by Feedback, just with its own subject pill hidden (shown once per group
// here instead) and useCampaignPosition set, so "already voted" reflects
// activity within the campaign window rather than the account's real,
// all-time vault balance.
export const CampaignGroupedList: React.FC<CampaignGroupedListProps> = ({
  isLoading,
  voteItems,
  onChangeUnits,
  isVoteDirectionAllowed,
  walletAddress = "",
  network = Network.MAINNET,
}) => {
  const groups = useMemo(() => {
    const map = new Map<string, VoteItem[]>();
    for (const item of voteItems) {
      const key = item.subject_term_id ?? item.subject;
      const existing = map.get(key);
      if (existing) existing.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries());
  }, [voteItems]);

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        {Array.from({ length: 3 }).map((_, groupIndex) => (
          <div className={styles.skeletonGroup} key={groupIndex}>
            <div className={styles.skeletonHeader}>
              <div className={styles.skeletonCircleSmall} />
              <div className={styles.skeletonBar} />
            </div>
            {Array.from({ length: 2 }).map((_, rowIndex) => (
              <div className={styles.skeletonRow} key={rowIndex}>
                <div className={styles.skeletonBarNarrow} />
                <div className={styles.skeletonActions}>
                  <div className={styles.skeletonCircle} />
                  <div className={styles.skeletonCircle} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {groups.map(([key, items]) => {
        const subject = items[0];
        const showSubjectImage = subject.subject_image &&
          getAtomVerificationStatus(subject.subject_term_id ?? undefined).status !== 'not-verified';

        return (
          <div className={styles.group} key={key}>
            <div className={styles.groupHeader}>
              {showSubjectImage && (
                <SafeImage
                  src={subject.subject_image ?? undefined}
                  alt=""
                  className={styles.subjectImage}
                  placeholderElement={<span />}
                />
              )}
              <span className={styles.subjectLabel}>{subject.subject}</span>
              {subject.attestation_type && (
                <span className={styles.typeLabel}>({subject.attestation_type})</span>
              )}
            </div>
            <div className={styles.groupItems}>
              {items.map((item) => (
                <ClaimItem
                  key={item.id.toString()}
                  voteItem={item}
                  onChangeUnits={onChangeUnits}
                  isVoteDirectionAllowed={isVoteDirectionAllowed}
                  walletAddress={walletAddress}
                  network={network}
                  useCampaignPosition
                  showSubjectPill={false}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

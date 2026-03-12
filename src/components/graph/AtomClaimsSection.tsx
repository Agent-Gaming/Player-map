import React from "react";
import SafeImage from "../SafeImage";
import styles from "./AtomClaimsSection.module.css";
import upSvg from "../../assets/img/up.svg";
import downSvg from "../../assets/img/down.svg";
import upNotSelectedSvg from "../../assets/img/upNotSelected.svg";
import downNotSelectedSvg from "../../assets/img/downNotSelected.svg";

interface AtomClaimsSectionProps {
  claims: any[];
  title?: string;
  myPositions?: any[];
}

const AtomClaimsSection: React.FC<AtomClaimsSectionProps> = ({
  claims,
  title = "Attestation",
  myPositions = [],
}) => {
  const normalizeId = (value: unknown) => String(value ?? "").toLowerCase();
  const myPositionTermIds = new Set(
    myPositions
      .map((position) => normalizeId(position?.term_id))
      .filter((id) => id.length > 0)
  );

  if (claims.length === 0) {
    return (
      <p className={styles.emptyMessage}>
        No attestation found.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      {title && (
        <div className={styles.header}>
          <span className={styles.headerTitle}>
            {title} ({claims.length})
          </span>
          <div className={styles.headerDivider} />
        </div>
      )}

      <div className={styles.scrollList}>
        {claims.map((claim) => {
          const forCount = claim.term?.positions_aggregate?.aggregate?.count ?? 0;
          const againstCount = claim.counter_term?.positions_aggregate?.aggregate?.count ?? 0;
          const forTermId = normalizeId(claim.term?.id ?? claim.term_id);
          const againstTermId = normalizeId(claim.counter_term?.id ?? claim.counter_term_id);
          const hasVotedFor = forTermId.length > 0 && myPositionTermIds.has(forTermId);
          const hasVotedAgainst = againstTermId.length > 0 && myPositionTermIds.has(againstTermId);

          return (
            <div
              key={claim.term_id}
              className={styles.claimRow}
            >
              {/* Subject + Predicate + Object */}
              <div className={styles.tripleWrapper}>
                {/* Subject pill */}
                {claim.subject && (
                  <div className={styles.pill}>
                    {claim.subject?.image && (
                      <SafeImage
                        src={claim.subject.image}
                        alt={claim.subject?.label ?? ""}
                        style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      />
                    )}
                    <span className={styles.pillLabel}>
                      {claim.subject?.label ?? "—"}
                    </span>
                  </div>
                )}

                {/* Predicate label */}
                <span className={styles.predicate}>
                  {claim.predicate?.label ?? ""}
                </span>

                {/* Object pill */}
                <div className={styles.pill}>
                  {claim.object?.image && (
                    <SafeImage
                      src={claim.object.image}
                      alt={claim.object?.label ?? ""}
                      style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <span className={styles.pillLabel}>
                    {claim.object?.label ?? "—"}
                  </span>
                </div>
              </div>

              {/* Votes */}
              <div className={styles.voteGroup}>
                <div className={styles.voteItem}>
                  <img src={hasVotedFor ? upSvg : upNotSelectedSvg} alt="up" className={styles.voteIcon} />
                  <span
                    className={styles.voteCount}
                    style={{ color: hasVotedFor ? "#006FE8" : "rgba(255,255,255,0.35)" }}
                  >
                    {forCount}
                  </span>
                </div>
                <div className={styles.voteItem}>
                  <img src={hasVotedAgainst ? downSvg : downNotSelectedSvg} alt="down" className={styles.voteIcon} />
                  <span
                    className={styles.voteCount}
                    style={{ color: hasVotedAgainst ? "#FF9500" : "rgba(255,255,255,0.35)" }}
                  >
                    {againstCount}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AtomClaimsSection;

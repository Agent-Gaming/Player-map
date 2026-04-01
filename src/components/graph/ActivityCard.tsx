import React from "react";
import upSvg from "../../assets/img/up.svg";
import downSvg from "../../assets/img/down.svg";
import upNotSelectedSvg from "../../assets/img/upNotSelected.svg";
import downNotSelectedSvg from "../../assets/img/downNotSelected.svg";
import styles from "./ActivityCard.module.css";

interface ActivityCardProps {
  activity: any;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const term = activity.term;
  const vaultType = activity.vault_type;
  
  // Determine if this is For or Against based on vault type
  const isFor = vaultType === "Triple" || vaultType === "Atom";
  const isAgainst = vaultType === "CounterTriple" || vaultType === "CounterAtom";
  
  const isAtomActivity = !term?.triple;
  const activeTerm = isAtomActivity ? term : (isFor ? term : term?.triple?.counter_term);
  
  // Get activity description components for visual display
  const truncateId = (id?: string) =>
    id ? id.slice(0, 6) + '…' + id.slice(-4) : '?';

  const getActivityComponents = () => {
    if (activeTerm?.triple) {
      const t = activeTerm.triple;
      const inner = t._innerTriple ?? (!t.subject?.label && t.subject_term?.triple);
      if (!t.subject?.label && inner) {
        return {
          type: 'triple',
          subject: inner.object?.label || truncateId(inner.object?.term_id),
          predicate: t.predicate?.label || truncateId(t.predicate_id),
          object: t.object?.label || truncateId(t.object?.term_id),
          objectImage: t.object?.image,
        };
      }
      return {
        type: 'triple',
        subject: t.subject?.label || truncateId(t.subject_id),
        predicate: t.predicate?.label || truncateId(t.predicate_id),
        object: t.object?.label || truncateId(t.object?.term_id),
        objectImage: t.object?.image,
      };
    } else if (activeTerm?.atom) {
      return {
        type: 'atom',
        label: activeTerm.atom.label || truncateId(activeTerm.atom.term_id),
      };
    }
    return { type: 'unknown' };
  };
  
  
  // Vote counts
  const forCount = isFor ? (term?.positions_aggregate?.aggregate?.count ?? 0) : 0;
  const againstCount = isAgainst
    ? (term?.positions_aggregate?.aggregate?.count ?? 0)
    : (term?.triple?.counter_term?.positions_aggregate?.aggregate?.count ?? 0);

  // Labels + images
  const activityComponents = getActivityComponents();
  const subjectLabel = activityComponents.type === 'triple' ? activityComponents.subject : null;
  const predicateLabel = activityComponents.type === 'triple' ? activityComponents.predicate : null;
  const objectLabel = activityComponents.type === 'triple'
    ? activityComponents.object
    : activityComponents.type === 'atom'
    ? activityComponents.label
    : 'Unknown';
  const subjectImage = activeTerm?.triple?.subject?.image;
  const objectImage = (activityComponents as any).objectImage ?? activeTerm?.triple?.object?.image;

  // Date courte
  const isRedeem = activity.activity_type === 'redemption';
  const dateStr = activity.created_at
    ? new Date(activity.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null;

  return (
    <div className={styles.card}>
      {/* Triple / Atom display */}
      <div className={styles.tripleArea}>
        {/* Badge Deposit / Redeem */}
        <span className={`${styles.badge} ${isRedeem ? styles.badgeRedeem : styles.badgeDeposit}`}>
          {isRedeem ? "Redeem" : "Deposit"}
        </span>
        {activityComponents.type === 'triple' ? (
          <>
            <div title={subjectLabel} className={styles.pill}>
              {subjectImage && <img src={subjectImage} alt="" className={styles.pillImg} />}
              <span className={styles.pillLabel}>{subjectLabel}</span>
            </div>
            <span className={styles.predicate}>{predicateLabel}</span>
            <div title={objectLabel} className={styles.pill}>
              {objectImage && <img src={objectImage} alt="" className={styles.pillImg} />}
              <span className={styles.pillLabel}>{objectLabel}</span>
            </div>
          </>
        ) : (
          <div className={styles.pillFull}>
            <span className={styles.pillLabel}>{objectLabel}</span>
          </div>
        )}
      </div>

      {/* Vote icons + date */}
      <div className={styles.voteArea}>
        <div className={styles.voteGroup}>
          <img src={isFor ? upSvg : upNotSelectedSvg} alt="up" className={styles.voteImg} />
          <span className={`${styles.voteCount} ${isFor ? styles.voteCountFor : styles.voteCountDefault}`}>{forCount}</span>
        </div>
        <div className={styles.voteGroup}>
          <img src={isAgainst ? downSvg : downNotSelectedSvg} alt="down" className={styles.voteImg} />
          <span className={`${styles.voteCount} ${isAgainst ? styles.voteCountAgainst : styles.voteCountDefault}`}>{againstCount}</span>
        </div>
        {dateStr && <span className={styles.dateStr}>{dateStr}</span>}
      </div>
    </div>
  );
};

export default ActivityCard;

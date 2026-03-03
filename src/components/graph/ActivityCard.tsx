import React from "react";
import upSvg from "../../assets/img/up.svg";
import downSvg from "../../assets/img/down.svg";
import upNotSelectedSvg from "../../assets/img/upNotSelected.svg";
import downNotSelectedSvg from "../../assets/img/downNotSelected.svg";

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
  const getActivityComponents = () => {
    if (activeTerm?.triple?.subject?.label && activeTerm?.triple?.predicate?.label && activeTerm?.triple?.object?.label) {
      // Triple activity - return components for visual display
      return {
        type: 'triple',
        subject: activeTerm.triple.subject.label,
        predicate: activeTerm.triple.predicate.label,
        object: activeTerm.triple.object.label
      };
    } else if (activeTerm?.atom?.label) {
      // Atom activity
      return {
        type: 'atom',
        label: activeTerm.atom.label
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
  const objectImage = activeTerm?.triple?.object?.image;

  // Date courte
  const isRedeem = activity.activity_type === 'redemption';
  const dateStr = activity.created_at
    ? new Date(activity.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null;

  return (
    <div
      style={{
        padding: "10px 0",
        marginBottom: "2px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      {/* Triple / Atom display */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "5px", flex: 1, minWidth: 0 }}>
        {/* Badge Deposit / Redeem */}
        <span style={{
          fontSize: "0.72em",
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: isRedeem ? "#f87171" : "#4ade80",
          flexShrink: 0,
        }}>{isRedeem ? "Redeem" : "Deposit"}</span>
        {activityComponents.type === 'triple' && subjectLabel ? (
          <>
            <div title={subjectLabel} style={{ display: "inline-flex", alignItems: "center", gap: "5px", maxWidth: "130px", backgroundColor: "#1a1a1adc", padding: "5px 9px", borderRadius: "4px", overflow: "hidden" }}>
              {subjectImage && <img src={subjectImage} alt="" style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }} />}
              <span style={{ fontSize: "0.78em", color: "#D9D9D9", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subjectLabel}</span>
            </div>
            <span style={{ fontSize: "0.78em", color: "#D9D9D9", fontWeight: "bold", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{predicateLabel}</span>
            <div title={objectLabel} style={{ display: "inline-flex", alignItems: "center", gap: "5px", maxWidth: "130px", backgroundColor: "#1a1a1adc", padding: "5px 9px", borderRadius: "4px", overflow: "hidden" }}>
              {objectImage && <img src={objectImage} alt="" style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }} />}
              <span style={{ fontSize: "0.78em", color: "#D9D9D9", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{objectLabel}</span>
            </div>
          </>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", backgroundColor: "#1a1a1adc", padding: "5px 9px", borderRadius: "4px", overflow: "hidden", maxWidth: "100%" }}>
            <span style={{ fontSize: "0.78em", color: "#D9D9D9", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{objectLabel}</span>
          </div>
        )}
      </div>

      {/* Vote icons + date */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <img src={isFor ? upSvg : upNotSelectedSvg} alt="up" style={{ width: 24, height: 24 }} />
          <span style={{ color: isFor ? "#006FE8" : "rgba(255,255,255,0.45)", fontWeight: "bold", fontSize: "0.95em", minWidth: 16 }}>{forCount}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <img src={isAgainst ? downSvg : downNotSelectedSvg} alt="down" style={{ width: 24, height: 24 }} />
          <span style={{ color: isAgainst ? "#FF9500" : "rgba(255,255,255,0.45)", fontWeight: "bold", fontSize: "0.95em", minWidth: 16 }}>{againstCount}</span>
        </div>
        {dateStr && <span style={{ fontSize: "0.72em", color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{dateStr}</span>}
      </div>
    </div>
  );
};

export default ActivityCard;

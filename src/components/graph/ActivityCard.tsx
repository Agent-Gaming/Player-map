import React from "react";
import { TripleBubble, AtomBubble, PositionBubble } from './index';
import SafeImage from '../SafeImage';

interface InfoRowProps {
  label: string;
  value: string | number | undefined;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
    <span style={{ color: "#ffd32a", fontWeight: 700, minWidth: 110 }}>
      {label}:
    </span>
    <span style={{ color: "#fff" }}>{value || "N/A"}</span>
  </div>
);

interface AtomImageProps {
  src?: string;
  alt?: string;
}

const AtomImage: React.FC<AtomImageProps> = ({ src, alt }) => (
  <SafeImage
    src={src}
    alt={alt}
    style={{
      width: 48,
      height: 48,
      borderRadius: "50%",
      objectFit: "cover",
      boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      marginRight: 10,
    }}
    placeholderText="?"
    showPlaceholder={true}
  />
);

interface ValueBlockProps {
  value?: any;
}

const ValueBlock: React.FC<ValueBlockProps> = ({ value }) => {
  if (!value) return null;
  const { person, thing, organization } = value;
  return (
    <div style={{ marginTop: 6, marginBottom: 6 }}>
      {person && (
        <div style={{ color: "#ffd32a" }}>
          <b>Person:</b> {person.name} <br />
          <span style={{ color: "#fff" }}>{person.description}</span>
          {person.url && (
            <>
              <br />
              <a
                href={person.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ffd32a" }}
              >
                {person.url}
              </a>
            </>
          )}
        </div>
      )}
      {thing && (
        <div style={{ color: "#ffd32a" }}>
          <b>Thing:</b> {thing.name} <br />
          <span style={{ color: "#fff" }}>{thing.description}</span>
          {thing.url && (
            <>
              <br />
              <a
                href={thing.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ffd32a" }}
              >
                {thing.url}
              </a>
            </>
          )}
        </div>
      )}
      {organization && (
        <div style={{ color: "#ffd32a" }}>
          <b>Organization:</b> {organization.name} <br />
          <span style={{ color: "#fff" }}>{organization.description}</span>
          {organization.url && (
            <>
              <br />
              <a
                href={organization.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ffd32a" }}
              >
                {organization.url}
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface ActivityCardProps {
  activity: any;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const shares = Number(activity.shares || 0);
  const term = activity.term;
  const vaultType = activity.vault_type;
  const activityType = activity.activity_type; // 'deposit' or 'redemption'
  
  // Determine if this is For or Against based on vault type
  const isFor = vaultType === "Triple" || vaultType === "Atom";
  const isAgainst = vaultType === "CounterTriple" || vaultType === "CounterAtom";
  
  // Get the active term based on the activity
  // For atoms, there's no counter_term, so we always use term
  // For triples, we use term for "For" and counter_term for "Against"
  const isAtomActivity = !term?.triple; // If no triple, it's an atom activity
  const activeTerm = isAtomActivity ? term : (isFor ? term : term?.triple?.counter_term);
  const positionType = isFor ? "For" : "Against";
  
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
  
  
  // Determine the action type (deposit or redeem)
  const getActionType = () => {
    return activityType === 'deposit' ? 'Deposit' : 'Redeem';
  };

  // Determine if this is a redeem action
  const isRedeem = activityType === 'redemption';
  
  // Get the vault type
  const getVaultType = () => {
    return vaultType || "Unknown";
  };

  return (
    <div
      style={{
        background: "#232326",
        borderRadius: 14,
        padding: "18px 24px",
        marginBottom: 18,
        boxShadow: "0 2px 12px rgba(0,0,0,0.13)",
        borderLeft: `6px solid ${isRedeem ? "#F44336" : isFor ? "#006FE8" : "#FF9500"}`,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
      className="activity-card"
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div>
          {/* Position avec bulles discrètes - sur une ligne */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ color: "#ffd32a", fontWeight: 700, minWidth: 110 }}>
              Position:
            </span>
            {(() => {
              const activityComponents = getActivityComponents();
              if (activityComponents.type === 'triple') {
                return (
                  <TripleBubble
                    subject={activityComponents.subject}
                    predicate={activityComponents.predicate}
                    object={activityComponents.object}
                    fontSize="13px"
                  />
                );
              } else if (activityComponents.type === 'atom') {
                return (
                  <AtomBubble
                    label={activityComponents.label}
                    fontSize="13px"
                  />
                );
              } else {
                return <span style={{ color: '#fff', fontSize: '13px' }}>Unknown Position</span>;
              }
            })()}
          </div>

          {/* Action fusionnée avec Position - sur une ligne */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ color: "#ffd32a", fontWeight: 700, minWidth: 110 }}>
              Action:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#fff', fontSize: '13px' }}>
                {getActionType()} {getVaultType()}
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>-</span>
              <PositionBubble isFor={isFor} fontSize="12px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;

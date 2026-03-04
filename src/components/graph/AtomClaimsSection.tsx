import React from "react";
import SafeImage from "../SafeImage";
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
      <p style={{ color: "rgba(255,255,255,0.5)", fontStyle: "italic", fontSize: 13 }}>
        No attestation found.
      </p>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {title && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "0 0 10px",
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#ffd32a",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            {title} ({claims.length})
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,211,42,0.2)" }} />
        </div>
      )}

      <div style={{
        height: "calc(100vh - 352px)",
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,211,42,0.3) transparent",
      }}>
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
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Subject + Predicate + Object */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
                {/* Subject pill */}
                {claim.subject && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "#1a1a1adc",
                    padding: "5px 10px",
                    borderRadius: 4,
                    overflow: "hidden",
                    minWidth: 0,
                    maxWidth: "35%",
                  }}>
                    {claim.subject?.image && (
                      <SafeImage
                        src={claim.subject.image}
                        alt={claim.subject?.label ?? ""}
                        style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      />
                    )}
                    <span style={{
                      fontSize: "0.92em",
                      color: "#D9D9D9",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {claim.subject?.label ?? "—"}
                    </span>
                  </div>
                )}

                {/* Predicate label */}
                <span style={{
                  fontSize: "0.88em",
                  color: "rgba(255,255,255,0.45)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 90,
                  flexShrink: 0,
                }}>
                  {claim.predicate?.label ?? ""}
                </span>

                {/* Object pill */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: "#1a1a1adc",
                  padding: "5px 10px",
                  borderRadius: 4,
                  overflow: "hidden",
                  minWidth: 0,
                  maxWidth: "35%",
                }}>
                  {claim.object?.image && (
                    <SafeImage
                      src={claim.object.image}
                      alt={claim.object?.label ?? ""}
                      style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <span style={{
                    fontSize: "0.92em",
                    color: "#D9D9D9",
                    fontWeight: "bold",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {claim.object?.label ?? "—"}
                  </span>
                </div>
              </div>

              {/* Votes */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <img src={hasVotedFor ? upSvg : upNotSelectedSvg} alt="up" style={{ width: 18, height: 18 }} />
                  <span style={{
                    fontSize: "0.85em",
                    fontWeight: "bold",
                    color: hasVotedFor ? "#006FE8" : "rgba(255,255,255,0.35)",
                    minWidth: 14,
                  }}>
                    {forCount}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <img src={hasVotedAgainst ? downSvg : downNotSelectedSvg} alt="down" style={{ width: 18, height: 18 }} />
                  <span style={{
                    fontSize: "0.85em",
                    fontWeight: "bold",
                    color: hasVotedAgainst ? "#FF9500" : "rgba(255,255,255,0.35)",
                    minWidth: 14,
                  }}>
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

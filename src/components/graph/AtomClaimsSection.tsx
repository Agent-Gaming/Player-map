import React from "react";
import SafeImage from "../SafeImage";
import upSvg from "../../assets/img/up.svg";
import downSvg from "../../assets/img/down.svg";
import upNotSelectedSvg from "../../assets/img/upNotSelected.svg";
import downNotSelectedSvg from "../../assets/img/downNotSelected.svg";

interface AtomClaimsSectionProps {
  claims: any[];
  title?: string;
}

const AtomClaimsSection: React.FC<AtomClaimsSectionProps> = ({
  claims,
  title = "Claims",
}) => {
  if (claims.length === 0) {
    return (
      <p style={{ color: "rgba(255,255,255,0.5)", fontStyle: "italic", fontSize: 13 }}>
        No claims found.
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
              {/* Predicate + Object */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
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
                  maxWidth: "100%",
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
                  <img src={forCount > 0 ? upSvg : upNotSelectedSvg} alt="up" style={{ width: 18, height: 18 }} />
                  <span style={{
                    fontSize: "0.85em",
                    fontWeight: "bold",
                    color: forCount > 0 ? "#006FE8" : "rgba(255,255,255,0.35)",
                    minWidth: 14,
                  }}>
                    {forCount}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <img src={againstCount > 0 ? downSvg : downNotSelectedSvg} alt="down" style={{ width: 18, height: 18 }} />
                  <span style={{
                    fontSize: "0.85em",
                    fontWeight: "bold",
                    color: againstCount > 0 ? "#FF9500" : "rgba(255,255,255,0.35)",
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

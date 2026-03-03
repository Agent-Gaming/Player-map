import React from "react";
import { PositionBubble } from "./index";
import SafeImage from "../SafeImage";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";

interface ClaimsSectionProps {
  activities: any[];
  title?: string;
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
  constants?: DefaultPlayerMapConstants;
}

const ClaimsSection: React.FC<ClaimsSectionProps> = ({
  activities,
  title,
  constants,
}) => {
  // ── IDs de prédicats ─────────────────────────────────────────────────────────
  const IS_PLAYER_OF_ID = constants?.COMMON_IDS?.IS_PLAYER_OF;
  const IS_ID = constants?.COMMON_IDS?.IS;
  const guildIds = new Set((constants?.OFFICIAL_GUILDS || []).map((g) => g.id));

  // ── Groupes de claims ────────────────────────────────────────────────────────
  const isPlayerOfClaims = activities.filter((a) =>
    IS_PLAYER_OF_ID
      ? a.predicate_id === IS_PLAYER_OF_ID
      : a.predicate?.label === "is player of"
  );
  const isClaims = activities.filter((a) =>
    IS_ID ? a.predicate_id === IS_ID : a.predicate?.label === "is"
  );

  const games = isPlayerOfClaims.filter((a) => !guildIds.has(a.object_id));
  const guilds = isPlayerOfClaims.filter((a) => guildIds.has(a.object_id));
  const playerQualities = isClaims;

  // ── Composant : une ligne de claim ──────────────────────────────────────────
  const ClaimRow = ({ claim }: { claim: any }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Icône */}
      {claim.object?.image ? (
        <SafeImage
          src={claim.object.image}
          alt={claim.object?.label || ""}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          ⚛
        </div>
      )}

      {/* Nom */}
      <span
        style={{
          flex: 1,
          fontSize: 12,
          color: "#fff",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {claim.object?.label || "—"}
      </span>

      {/* Lien ↗ */}
      <a
        href={`https://explorer.intuition-api.com/triples/${claim.term_id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "rgba(255,211,42,0.8)",
          fontSize: 12,
          lineHeight: 1,
          textDecoration: "none",
          flexShrink: 0,
        }}
        title="View on Intuition"
      >
        ↗
      </a>

      {/* Votes */}
      <PositionBubble
        isFor={true}
        count={claim.term?.positions_aggregate?.aggregate?.count || 0}
        fontSize="11px"
        showCount={true}
      />
      <PositionBubble
        isFor={false}
        count={claim.counter_term?.positions_aggregate?.aggregate?.count || 0}
        fontSize="11px"
        showCount={true}
      />
    </div>
  );

  // ── Composant : groupe avec header ───────────────────────────────────────────
  const SectionGroup = ({
    label,
    items,
    showCount = true,
  }: {
    label: string;
    items: any[];
    showCount?: boolean;
  }) => (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.2,
          color: "rgba(255,211,42,0.85)",
          marginBottom: 4,
          textTransform: "uppercase",
        }}
      >
        {showCount ? `${items.length} ` : ""}
        {label}
      </div>
      {items.map((claim) => (
        <ClaimRow key={claim.term_id} claim={claim} />
      ))}
    </div>
  );

  // ── Rendu vide ───────────────────────────────────────────────────────────────
  if (activities.length === 0) {
    return (
      <p style={{ color: "rgba(255, 255, 255, 0.6)", fontStyle: "italic", fontSize: 13 }}>
        No claim found
      </p>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {title && (
        <h3 style={{ width: "100%", margin: "0 0 12px" }}>
          {title} ({activities.length})
        </h3>
      )}

      <div style={{ display: "flex", gap: 12, width: "100%", alignItems: "flex-start" }}>
        {/* Colonne gauche : Games + Guilds */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {games.length > 0 && <SectionGroup label="Game(s)" items={games} />}
          {guilds.length > 0 && <SectionGroup label="Guild(s)" items={guilds} />}
          {games.length === 0 && guilds.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>
              No games or guilds
            </p>
          )}
        </div>

        {/* Colonne droite : Prédicats "is" (Player qualities) */}
        {playerQualities.length > 0 && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionGroup label="Player" items={playerQualities} showCount={false} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimsSection;

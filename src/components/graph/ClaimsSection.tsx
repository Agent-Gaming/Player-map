import React from "react";
import { PositionBubble } from "./index";
import SafeImage from "../SafeImage";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import styles from "./ClaimsSection.module.css";

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
    <div className={styles.claimRow}>
      {/* Icône */}
      {claim.object?.image ? (
        <SafeImage
          src={claim.object.image}
          alt={claim.object?.label || ""}
          style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div className={styles.claimIconPlaceholder}>⚛</div>
      )}

      {/* Nom */}
      <span className={styles.claimLabel}>
        {claim.object?.label || "—"}
      </span>

      {/* Votes */}
      <PositionBubble
        isFor={true}
        count={claim.term?.positions_aggregate?.aggregate?.count || 0}
        fontSize="14px"
        showCount={true}
      />
      <PositionBubble
        isFor={false}
        count={claim.counter_term?.positions_aggregate?.aggregate?.count || 0}
        fontSize="14px"
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
    <div className={styles.groupWrapper}>
      <div className={styles.groupLabel}>
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
    return <p className={styles.emptyMessage}>No claim found</p>;
  }

  return (
    <div className={styles.root}>
      {title && (
        <h3 className={styles.title}>
          {title} ({activities.length})
        </h3>
      )}

      <div className={styles.columns}>
        {/* Colonne gauche : Games + Guilds */}
        <div className={styles.column}>
          {games.length > 0 && <SectionGroup label="Game(s)" items={games} />}
          {guilds.length > 0 && <SectionGroup label="Guild(s)" items={guilds} />}
          {games.length === 0 && guilds.length === 0 && (
            <p className={styles.noGamesMessage}>No games or guilds</p>
          )}
        </div>

        {/* Colonne droite : Prédicats "is" (Player qualities) */}
        {playerQualities.length > 0 && (
          <div className={styles.column}>
            <SectionGroup label="Player" items={playerQualities} showCount={false} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimsSection;

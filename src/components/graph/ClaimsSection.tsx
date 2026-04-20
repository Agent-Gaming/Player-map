import React from "react";
import { PositionBubble } from "./index";
import SafeImage from "../SafeImage";
import { useGameContext } from "../../contexts/GameContext";
import { PREDICATES } from "../../utils/constants";
import styles from "./ClaimsSection.module.css";

interface ClaimsSectionProps {
  activities: any[];
  title?: string;
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
}

const ClaimsSection: React.FC<ClaimsSectionProps> = ({
  activities,
  title,
}) => {
  const { games: allGames } = useGameContext();

  // ── IDs de prédicats ─────────────────────────────────────────────────────────
  const IS_PLAYER_OF_ID = PREDICATES.IS_PLAYER_OF;
  const IS_MEMBER_OF_ID = PREDICATES.IS_MEMBER_OF;
  const IS_ID = PREDICATES.IS;

  // All guild atomIds across every registered game — used to exclude old-format
  // "IS_PLAYER_OF → guild" triples that predate the nested IS_MEMBER_OF structure.
  const allGuildIds = new Set(allGames.flatMap((g) => g.guilds.map((guild) => guild.atomId)));

  // ── Groupes de claims ────────────────────────────────────────────────────────
  const isPlayerOfClaims = activities.filter((a) =>
    IS_PLAYER_OF_ID
      ? a.predicate_id === IS_PLAYER_OF_ID
      : a.predicate?.label === "is player of"
  );
  const isMemberOfClaims = activities.filter((a) =>
    IS_MEMBER_OF_ID ? a.predicate_id === IS_MEMBER_OF_ID : false
  );
  const isClaims = activities.filter((a) =>
    IS_ID ? a.predicate_id === IS_ID : a.predicate?.label === "is"
  );

  // Games: IS_PLAYER_OF where the object is not a guild in any registered game.
  // Old "IS_PLAYER_OF → guild" triples are excluded regardless of active game.
  const games = isPlayerOfClaims.filter((a) => !allGuildIds.has(a.object_id));
  // Guilds: only the current nested IS_MEMBER_OF format.
  const guilds = [...isMemberOfClaims];

  // Player qualities — group IS claims by quality atom, sum votes across all games
  const qualityMap = new Map<string, { object: { label: string; image?: string }; forCount: number; againstCount: number }>();
  for (const claim of isClaims) {
    const key = claim.object_id;
    if (!key || !claim.object) continue;
    const forCount = claim.term?.positions_aggregate?.aggregate?.count || 0;
    const againstCount = claim.counter_term?.positions_aggregate?.aggregate?.count || 0;
    const existing = qualityMap.get(key);
    if (existing) {
      existing.forCount += forCount;
      existing.againstCount += againstCount;
    } else {
      qualityMap.set(key, { object: claim.object, forCount, againstCount });
    }
  }
  // Only display qualities that have at least one vote
  const playerQualities = Array.from(qualityMap.values()).filter(q => q.forCount + q.againstCount > 0);

  // ── Composant : une ligne de claim ──────────────────────────────────────────
  const ClaimRow = ({ claim }: { claim: any }) => {
    const forCount = claim.forCount ?? claim.term?.positions_aggregate?.aggregate?.count ?? 0;
    const againstCount = claim.againstCount ?? claim.counter_term?.positions_aggregate?.aggregate?.count ?? 0;
    return (
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
        count={forCount}
        fontSize="14px"
        showCount={true}
      />
      <PositionBubble
        isFor={false}
        count={againstCount}
        fontSize="14px"
        showCount={true}
      />
    </div>
    );
  };

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
      {items.map((claim, idx) => (
        <ClaimRow key={claim.term_id ?? claim.object?.term_id ?? claim.object?.label ?? idx} claim={claim} />
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

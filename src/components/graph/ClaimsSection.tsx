import React, { useMemo } from "react";
import { PositionBubble } from "./index";
import SafeImage from "../SafeImage";
import { useGameContext } from "../../contexts/GameContext";
import { PREDICATES } from "../../utils/constants";
import ClaimActionRow from "./ClaimActionRow";
import { getAtomVerificationStatus } from "../../config/verifiedAtoms";
import styles from "./ClaimsSection.module.css";

interface ClaimsSectionProps {
  activities: any[];
  title?: string;
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
  myPositions?: any[];
}

const ClaimsSection: React.FC<ClaimsSectionProps> = ({
  activities,
  title,
  walletAddress,
  walletConnected,
  publicClient,
  myPositions = [],
}) => {
  const { games: allGames, activeGame } = useGameContext();
  const isInteractive = Boolean(walletAddress && walletConnected);

  const positionsByTermId = useMemo(() => {
    const map = new Map<string, { shares: bigint; curveId: bigint }>();
    for (const p of myPositions) {
      const termId = (p.term_id ?? '').toLowerCase();
      if (termId) {
        map.set(termId, {
          shares: BigInt(p.shares ?? 0),
          curveId: BigInt(p.curve_id ?? 1),
        });
      }
    }
    return map;
  }, [myPositions]);

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

  // Player qualities:
  // - Interactive mode: aggregate total for/against counts across ALL games (same quality),
  //   but use the context-nested triple scoped to the active game as the voting target.
  //   Falls back to bare IS triple if no context-scoped triple exists for this game.
  // - Static mode: aggregated by quality atom (sum votes, dedup)
  const playerQualities = useMemo(() => {
    if (isInteractive) {
      const activeGameId = activeGame?.atomId;

      // Group all IS claims (bare + context-remapped) by quality object_id
      const groupsByObjectId = new Map<string, { claims: any[]; totalFor: number; totalAgainst: number }>();
      for (const a of isClaims) {
        const key: string = a.object_id ?? a.object?.term_id ?? a.object?.label;
        if (!key || !a.object) continue;
        const forCount  = a.term?.positions_aggregate?.aggregate?.count ?? 0;
        const againstCount = a.counter_term?.positions_aggregate?.aggregate?.count ?? 0;
        const entry = groupsByObjectId.get(key);
        if (entry) {
          entry.claims.push(a);
          entry.totalFor     += forCount;
          entry.totalAgainst += againstCount;
        } else {
          groupsByObjectId.set(key, { claims: [a], totalFor: forCount, totalAgainst: againstCount });
        }
      }

      // For each quality group: pick context-scoped claim for active game as voting target
      // (falls back to bare IS), override counts with aggregated totals
      return Array.from(groupsByObjectId.values())
        .map(({ claims, totalFor, totalAgainst }) => {
          const contextClaim = activeGameId
            ? claims.find((c: any) => c.context_game_id === activeGameId)
            : null;
          const votingClaim = contextClaim ?? claims.find((c: any) => !c.context_game_id) ?? claims[0];
          return { ...votingClaim, forCount: totalFor, againstCount: totalAgainst };
        })
        .filter((a: any) => a.object != null);
    }
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
    return Array.from(qualityMap.values()).filter(q => q.forCount + q.againstCount > 0);
  }, [isClaims, isInteractive]);

  // ── Composant : une ligne de claim ──────────────────────────────────────────
  const ClaimRow = ({ claim }: { claim: any }) => {
    const forCount = claim.forCount ?? claim.term?.positions_aggregate?.aggregate?.count ?? 0;
    const againstCount = claim.againstCount ?? claim.counter_term?.positions_aggregate?.aggregate?.count ?? 0;
    const objectVerif = getAtomVerificationStatus(claim.object_id ?? claim.object?.term_id);
    const showObjectImage = claim.object?.image && objectVerif.status !== 'not-verified';
    return (
    <div className={styles.claimRow}>
      {/* Icône */}
      {showObjectImage ? (
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
      {items.map((claim, idx) =>
        isInteractive ? (
          <ClaimActionRow
            key={claim.term_id ?? claim.object?.term_id ?? claim.object?.label ?? idx}
            claim={claim}
            walletAddress={walletAddress!}
            walletConnected={walletConnected}
            publicClient={publicClient}
            positionsByTermId={positionsByTermId}
          />
        ) : (
          <ClaimRow key={claim.term_id ?? claim.object?.term_id ?? claim.object?.label ?? idx} claim={claim} />
        )
      )}
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

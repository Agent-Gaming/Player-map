import React from "react";
import { GameStats } from "../../hooks/useGameStats";
import { ipfsToHttpUrl, isIpfsUrl } from "../../utils/pinata";
import tripleSvg from "../../assets/img/triple.svg";
import styles from "./SpeakUpHeader.module.css";

interface SpeakUpHeaderProps {
  stats: GameStats;
}

const DECORATOR: Record<string, React.CSSProperties> = {
  guild: {
    width: 28,
    height: 28,
    border: "3px solid #22c55e",
    borderRadius: 5,
  },
  player: {
    width: 28,
    height: 28,
    border: "3px solid #ffd32a",
    borderRadius: "50%",
  },
};

const BAR_GRADIENT: Record<string, string> = {
  triple: "linear-gradient(to right, #3b82f6, #f97316)",
  attestation: tripleSvg,
};

const StatCard: React.FC<{
  label: string;
  value: number | string;
  loading: boolean;
  variant: "guild" | "player" | "triple" | "attestation";
}> = ({ label, value, loading, variant }) => {
  const isBar = variant === "triple" || variant === "attestation";

  return (
    <div className={styles.statCard}>
      {/* Label */}
      <span className={styles.statLabel}>
        {label}
      </span>

      {/* Nombre + décorateur */}
      {isBar ? (
        <>
          {loading ? (
            <div className={styles.skeletonBar} />
          ) : (
            <span className={styles.statNumberLarge}>{value}</span>
          )}
          {variant === "attestation" ? (
            <img src={BAR_GRADIENT[variant]} alt={variant} className={styles.statBarImage} />
          ) : (
            <div className={styles.statBar} style={{ background: BAR_GRADIENT[variant] }} />
          )}
        </>
      ) : (
        <div
          className={`${styles.statValueBoxBase} ${variant === "guild" ? styles.statValueBoxGuild : styles.statValueBoxPlayer}`}
        >
          {loading ? (
            <div className={styles.skeleton} />
          ) : (
            <span className={styles.statNumber}>{value}</span>
          )}
        </div>
      )}
    </div>
  );
};

export const SpeakUpHeader: React.FC<SpeakUpHeaderProps> = ({ stats }) => {
  const { gameName, gameImage, totalGuilds, totalPlayers, totalVotes, totalAttestations, loading } = stats;

  const imageUrl = gameImage ? (isIpfsUrl(gameImage) ? ipfsToHttpUrl(gameImage) : gameImage) : null;

  return (
    <div className={styles.header}>
      {/* Titre du jeu */}
      <div className={styles.titleRow}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={gameName}
            className={styles.gameImage}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <span className={styles.gameName}>
          {loading ? "Loading..." : (gameName || "—")}
        </span>
      </div>

      {/* Statistiques */}
      <div className={styles.statsRow}>
        <StatCard label="Guilds"       value={totalGuilds}       loading={false}   variant="guild" />
        <div className={styles.statsDivider} />
        <StatCard label="Players"      value={totalPlayers}      loading={loading} variant="player" />
        <div className={styles.statsDivider} />
        <StatCard label="Attestation"  value={totalAttestations} loading={loading} variant="attestation" />
        <div className={styles.statsDivider} />
        <StatCard label="Votes"        value={totalVotes}        loading={loading} variant="triple" />
      </div>
    </div>
  );
};

export default SpeakUpHeader;

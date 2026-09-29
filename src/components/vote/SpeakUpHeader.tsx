import React from "react";
import { useState } from "react";
import { GameStats } from "../../hooks/useGameStats";
import { ipfsToHttpUrl, isIpfsUrl } from "../../utils/pinata";
import tripleSvg from "../../assets/img/triple.svg";
import { getAtomVerificationStatus } from "../../config/verifiedAtoms";
import verifiedIcon from "../../assets/img/verified.svg";
import communityIcon from "../../assets/img/community.svg";
import { useGamePublicInfo } from "../../hooks/useGamePublicInfo";
import { DEV_STEP_LABEL, DEV_STEP_COLOR } from "../../config/devStep";
import styles from "./SpeakUpHeader.module.css";
import bannImageDefault from '../img/bannGame.png';

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
};

const BAR_GRADIENT: Record<string, string> = {
  triple: "linear-gradient(to right, #3b82f6, #f97316)",
  attestation: tripleSvg,
};

// Same thresholds/colors as the dashboard's GameScoreGauge score box.
const getScoreColor = (value: number): string =>
  value < 40 ? "#FF7188" :
  value < 70 ? "#F1D02D" :
  value < 90 ? "#40B25A" :
               "#7BE17D";

const SCORE_TOOLTIP_TEXT = "Player first game score calculated with player community feedback";

const StatCard: React.FC<{
  label: string;
  value: number | string;
  loading: boolean;
  variant: "guild" | "player" | "triple" | "attestation" | "score";
}> = ({ label, value, loading, variant }) => {
  const isBar = variant === "triple" || variant === "attestation";
  const isScore = variant === "score";
  const numericValue = typeof value === "number" ? value : Number(value);
  const scoreColor = isScore && !Number.isNaN(numericValue) ? getScoreColor(numericValue) : undefined;
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);

  return (
    <div className={styles.statCard}>
      {/* Label 
      <span className={styles.statLabel}>
        {label}
      </span>
      */}
      {/* Nombre + décorateur */}
      {isBar ? (
        <>
          {loading ? (
            <div className={styles.skeletonBar} />
          ) : (
            <span className={styles.statNumberLarge}>{value}</span>
          )}
          {/*
          {variant === "attestation" ? (
            <img src={BAR_GRADIENT[variant]} alt={variant} className={styles.statBarImage} />
          ) : (
            <div className={styles.statBar} style={{ background: BAR_GRADIENT[variant] }} />
          )}
            */}
        </>
      ) : isScore ? (
        <div
          className={styles.scoreWrapper}
          onMouseEnter={() => setShowScoreTooltip(true)}
          onMouseLeave={() => setShowScoreTooltip(false)}
        >
          <div
            className={styles.statValueBoxScore}
            style={scoreColor ? { background: scoreColor } : undefined}
          >
            {loading ? (
              <div className={styles.skeleton} />
            ) : (
              <span className={styles.statNumberScore}>{value}</span>
            )}
          </div>
          {showScoreTooltip && (
            <div className={styles.tooltip}>
              {SCORE_TOOLTIP_TEXT}
              <div className={styles.tooltipArrow} />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`${styles.statValueBoxBase} ${
            variant === "guild" ? styles.statValueBoxGuild : styles.statValueBoxPlayer
          }`}
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
  const { gameName, gameImage, gameTermId, totalGuilds, totalPlayers, totalVotes, totalAttestations, loading } = stats;
  const [showTooltip, setShowTooltip] = useState(false);

  const verification = gameTermId ? getAtomVerificationStatus(gameTermId) : null;
  const imageUrl = (gameImage && verification?.status !== 'not-verified') ? ipfsToHttpUrl(gameImage) : null;
  const { info: gamePublicInfo, isLoading: gamePublicInfoLoading } = useGamePublicInfo(gameTermId ?? undefined);
  const devStep = gamePublicInfo?.dev_step;
  const [imageError, setImageError] = useState(false);

  return (
    <div className={styles.header}>
    <div className={styles.bannGameCard}>
      <img src={bannImageDefault} alt="" />
    </div>
      {/* Titre du jeu */}
      <div className={styles.titleRow}>
      {imageUrl && !imageError ? (
  <img
    src={imageUrl}
    alt={gameName}
    className={styles.gameImage}
    onError={() => setImageError(true)}
  />
) : (
  <div className={styles.gameImageFallback}>
    {(gameName || "?").charAt(0).toUpperCase()}
  </div>
)}
        
        <div className={styles.gameNameContainer}>
       
        <span className={styles.gameName}>
          {loading ? "Loading..." : (gameName || "—")}
          {verification && (
          <div
            className={styles.badgeWrapper}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {verification.status === "verified" ? (
              <img src={verifiedIcon} alt="Verified" className={styles.badgeIcon} />
            ) : verification.status === "not-verified" ? (
              <img src={communityIcon} alt="Community" className={styles.badgeIcon} />
            ) : null}
            {showTooltip && verification.status === "verified" && (
              <div className={styles.tooltip}>
                Verified by studio : This atom is approved by the rights holder.
                <div className={styles.tooltipArrow} />
              </div>
            )}
            {showTooltip && verification.status === "not-verified" && (
              <div className={styles.tooltip}>
                Community created : This atom is community-created and has not been reviewed or approved by the rights holder.
                <div className={styles.tooltipArrow} />
              </div>
            )}
          </div>
        )}
        </span>

        {devStep && (
          <span
            className={styles.devStepBadge}
            style={{
              color: DEV_STEP_COLOR[devStep],
              borderColor: `${DEV_STEP_COLOR[devStep]}40`,
              background: `${DEV_STEP_COLOR[devStep]}14`,
            }}
          >
            {DEV_STEP_LABEL[devStep]}
          </span>
        )}
        </div>
       
       <div className={styles.scoreGameCardContainer}>
       <StatCard label="Score"          value={gamePublicInfo?.game_score.overall ?? "—"} loading={gamePublicInfoLoading} variant="score" />
       </div>
      </div>

      {/* Statistiques */}
      <div className={styles.statsRow}>
         {/* Guild Stat -----------------------------
          <span className={styles.label}>Guild</span>
          <StatCard label="Guild(s)"       value={totalGuilds}       loading={false}   variant="guild" />
        */}


        <div className={styles.statContainer}>
          <span className={styles.labelStat}>Player</span>
          <StatCard label="Player(s)"      value={totalPlayers}      loading={loading} variant="player" />
        </div>
        <div className={styles.statsDivider} />
        <div className={styles.statContainer}>
        <span className={styles.labelStat}>Attestations</span>
          <StatCard label="Attestation(s)"  value={totalAttestations} loading={loading} variant="attestation" />
          </div>
        <div className={styles.statsDivider} />
        <div className={styles.statContainer}>
          <span className={styles.labelStat}>Votes</span>
          <StatCard label="Vote(s)"        value={totalVotes}        loading={loading} variant="triple" />
        </div>
      </div>
    </div>
  );
};

export default SpeakUpHeader;

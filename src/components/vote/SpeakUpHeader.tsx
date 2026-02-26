import React from "react";
import { GameStats } from "../../hooks/useGameStats";
import { ipfsToHttpUrl, isIpfsUrl } from "../../utils/pinata";

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
  triple: "linear-gradient(to right, #22c55e, #888, #ffd32a)",
  attestation: "linear-gradient(to right, #3b82f6, #f97316)",
};

const StatCard: React.FC<{
  label: string;
  value: number | string;
  loading: boolean;
  variant: "guild" | "player" | "triple" | "attestation";
}> = ({ label, value, loading, variant }) => {
  const isBar = variant === "triple" || variant === "attestation";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        flex: 1,
        padding: "8px 4px",
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: 12,
          fontWeight: "bold",
          color: "#ffd32a",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      {/* Nombre + décorateur */}
      {isBar ? (
        <>
          {loading ? (
            <div style={{ width: 36, height: 28, background: "rgba(255,255,255,0.1)", borderRadius: 4 }} />
          ) : (
            <span style={{ fontSize: 32, fontWeight: "bold", color: "#fff", lineHeight: 1 }}>{value}</span>
          )}
          <div style={{ width: 72, height: 7, borderRadius: 4, background: BAR_GRADIENT[variant] }} />
        </>
      ) : (
        <div
          style={{
            ...DECORATOR[variant],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 54,
            height: 54,
          }}
        >
          {loading ? (
            <div style={{ width: 24, height: 24, background: "rgba(255,255,255,0.1)", borderRadius: 4 }} />
          ) : (
            <span style={{ fontSize: 26, fontWeight: "bold", color: "#fff", lineHeight: 1 }}>{value}</span>
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
    <div
      style={{
        width: "100%",
        paddingBottom: 12,
        marginBottom: 4,
      }}
    >
      {/* Titre du jeu */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "14px 16px 12px",
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={gameName}
            style={{ width: 38, height: 38, borderRadius: 6, objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <span
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: "#fff",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {loading ? "Loading..." : (gameName || "—")}
        </span>
      </div>

      {/* Statistiques */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "stretch",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 12,
          margin: "0 12px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <StatCard label="Total Guilds"       value={totalGuilds}       loading={false}   variant="guild" />
        <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
        <StatCard label="Total Players"      value={totalPlayers}      loading={loading} variant="player" />
        <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
        <StatCard label="Total Attestation"  value={totalAttestations} loading={loading} variant="attestation" />
        <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
        <StatCard label="Total Votes"        value={totalVotes}        loading={loading} variant="triple" />
      </div>
    </div>
  );
};

export default SpeakUpHeader;

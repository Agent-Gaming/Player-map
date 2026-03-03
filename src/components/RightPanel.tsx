import React, { useState } from "react";
import { RightPanelMode } from "./TopNavBar";
import { ClaimVoting } from "./vote/ClaimVoting";
import { SpeakUpHeader } from "./vote/SpeakUpHeader";
import AtomDetailsSection from "./graph/AtomDetailsSection";
import ClaimsSection from "./graph/ClaimsSection";
import AtomClaimsSection from "./graph/AtomClaimsSection";
import PositionsSection from "./graph/PositionsSection";
import ActivitySection from "./graph/ActivitySection";
import { DefaultPlayerMapConstants } from "../types/PlayerMapConfig";
import { Network } from "../hooks/useAtomData";
import { useGameStats } from "../hooks/useGameStats";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RightPanelProps {
  mode: RightPanelMode;

  // wallet
  walletAddress?: string;
  walletConnected?: any;
  wagmiConfig?: any;

  // constantes
  constants: DefaultPlayerMapConstants;

  // données "mon profil"
  myAtomDetails?: any;
  myTriples?: any[];
  myPositions?: any[];
  myActivities?: any[];
  myConnections?: { follows: any[]; followers: any[] };
  sidebarLoading?: boolean;
  sidebarError?: string | null;

  // données "atom sélectionné"
  selectedAtomDetails?: any;
  selectedClaims?: any[];
  selectedLoading?: boolean;
  selectedError?: string | null;
}


// ─── Contenu "Mode Atom" ────────────────────────────────────────────────────────

const AtomContent: React.FC<{
  atomDetails: any;
  claims: any[];
  connections: { follows: any[]; followers: any[] };
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
  loading?: boolean;
  error?: string | null;
  title?: string;
}> = ({
  atomDetails,
  claims,
  connections,
  walletAddress,
  walletConnected,
  publicClient,
  loading,
  error,
  title = "Claims",
}) => {
  if (loading) return <p style={{ padding: 20, color: "#aaa" }}>Loading…</p>;
  if (error) return <p style={{ padding: 20, color: "#f87171" }}>{error}</p>;
  if (!atomDetails)
    return (
      <p style={{ padding: 20, color: "#aaa", fontSize: 14 }}>
        Click on a graph node to view its details.
      </p>
    );

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <AtomDetailsSection
        atomDetails={atomDetails}
        connections={connections}
        walletAddress={walletAddress}
      />
      <div style={{ marginTop: 16 }}>
        <AtomClaimsSection
          claims={claims}
          title={title}
        />
      </div>
    </div>
  );
};

// ─── Bloc de stats joueur ────────────────────────────────────────────────────────

const PlayerStatBlock: React.FC<{
  label: string;
  value: string | number;
  gradient?: string;
}> = ({ label, value, gradient }) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 6px",
      gap: 6,
    }}
  >
    <span style={{ fontSize: 11, fontWeight: 700, color: "#ffd32a", letterSpacing: "0.07em", textTransform: "uppercase", textAlign: "center", whiteSpace: "nowrap" }}>
      {label}
    </span>
    <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
      {value}
    </span>
    {gradient && (
      <div style={{ width: 60, height: 5, borderRadius: 4, background: gradient }} />
    )}
  </div>
);

// ─── Séparateur de section ────────────────────────────────────────────────────────

const SectionDivider: React.FC<{ title: string }> = ({ title }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "18px 0 10px",
  }}>
    <span style={{
      fontSize: 12,
      fontWeight: 700,
      color: "#ffd32a",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: "rgba(255,211,42,0.2)" }} />
  </div>
);

// ─── Onglets Positions / Activity ────────────────────────────────────────────

const ProfileTabs: React.FC<{
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
}> = ({ walletAddress, walletConnected, publicClient }) => {
  const [activeTab, setActiveTab] = useState<"positions" | "activity">("positions");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "9px 0",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid #ffd32a" : "2px solid transparent",
    color: active ? "#ffd32a" : "#888",
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  });

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginTop: 18 }}>
      {/* ── En-têtes onglets ─── */}
      <div style={{ flexShrink: 0, display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <button style={tabStyle(activeTab === "positions")} onClick={() => setActiveTab("positions")}>
          My Positions
        </button>
        <button style={tabStyle(activeTab === "activity")} onClick={() => setActiveTab("activity")}>
          Activity History
        </button>
      </div>

      {/* ── Contenu avec scrollbar ─── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,211,42,0.3) transparent",
        paddingTop: 4,
        paddingBottom: 16,
      }}>
        {activeTab === "positions" && (
          <PositionsSection
            accountId={walletAddress || ""}
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            publicClient={publicClient}
          />
        )}
        {activeTab === "activity" && (
          <ActivitySection accountId={walletAddress || ""} />
        )}
      </div>
    </div>
  );
};

// ─── Contenu "Mode Profil" ──────────────────────────────────────────────────────

const ProfileContent: React.FC<{
  atomDetails: any;
  connections: { follows: any[]; followers: any[] };
  activities: any[];
  positions?: any[];
  triples?: any[];
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
  loading?: boolean;
  error?: string | null;
  constants?: DefaultPlayerMapConstants;
}> = ({
  atomDetails,
  connections,
  activities,
  positions = [],
  triples = [],
  walletAddress,
  walletConnected,
  publicClient,
  loading,
  error,
  constants,
}) => {
  if (loading) return <p style={{ padding: 20, color: "#aaa" }}>Loading…</p>;
  if (error) return <p style={{ padding: 20, color: "#f87171" }}>{error}</p>;
  if (!atomDetails)
    return (
      <p style={{ padding: 20, color: "#aaa", fontSize: 14 }}>
        Connect your wallet to view your profile.
      </p>
    );

  // ── Stats calculées depuis les claims ──────────────────────────────────────────
  const totalClaims = triples.length; // Nombre de triples créés
  const totalAttestations = activities.reduce(
    (sum, a) => sum + (a.term?.positions_aggregate?.aggregate?.count || 0) + (a.counter_term?.positions_aggregate?.aggregate?.count || 0),
    0
  );
  const totalVotes = positions.length; // Nombre de positions dans "my positions"

  console.log("ProfileContent Stats:", { totalClaims, totalAttestations, totalVotes, triples: triples.length, positions: positions.length });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: "0px 16px 30px 16px" }}>
      {/* ── Header joueur ───────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
      <AtomDetailsSection
        atomDetails={atomDetails}
        connections={connections}
        walletAddress={walletAddress}
      />
      </div>

      {/* ── Bloc de stats ──────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.07)",
        margin: "16px 0 0",
        overflow: "hidden",
      }}>
        <PlayerStatBlock
          label="Total Claims"
          value={totalClaims}
          gradient="linear-gradient(to right, #ffd32a, #f97316)"
        />
        <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
        <PlayerStatBlock
          label="Total Attestation"
          value={totalAttestations}
          gradient="linear-gradient(to right, #22c55e, #888, #ffd32a)"
        />
        <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
        <PlayerStatBlock
          label="Total Votes"
          value={totalVotes}
          gradient="linear-gradient(to right, #3b82f6, #f97316)"
        />
      </div>
      </div>

      {/* ── Mes Claims ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
      <SectionDivider title="My Claims" />
      <ClaimsSection
        activities={activities}
        title=""
        walletAddress={walletAddress}
        walletConnected={walletConnected}
        publicClient={publicClient}
        constants={constants}
      />
      </div>

      {/* ── Onglets Positions / Activity ──────────────────────────────────── */}
      <ProfileTabs
        walletAddress={walletAddress}
        walletConnected={walletConnected}
        publicClient={publicClient}
      />
    </div>
  );
};

// ─── Contenu "Mode SpeakUp" ─────────────────────────────────────────────────────

const SpeakUpContent: React.FC<{
  walletAddress?: string;
  walletConnected?: any;
  wagmiConfig?: any;
  constants: DefaultPlayerMapConstants;
}> = ({ walletAddress, walletConnected, wagmiConfig, constants }) => {
  const stats = useGameStats(constants, Network.MAINNET);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <SpeakUpHeader stats={stats} />
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "12px",
          margin: "0px 12px 17px 12px",
          background: "rgb(65 65 65 / 15%)",
        }}
      >
        <ClaimVoting
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          publicClient={wagmiConfig?.publicClient}
          network={Network.MAINNET}
          wagmiConfig={wagmiConfig}
          constants={constants}
        />
      </div>
    </div>
  );
};

// ─── RightPanel principal ───────────────────────────────────────────────────────

const RightPanel: React.FC<RightPanelProps> = ({
  mode,
  walletAddress,
  walletConnected,
  wagmiConfig,
  constants,
  myAtomDetails,
  myActivities = [],
  myPositions = [],
  myTriples = [],
  myConnections = { follows: [], followers: [] },
  sidebarLoading,
  sidebarError,
  selectedAtomDetails,
  selectedClaims = [],
  selectedLoading,
  selectedError,
}) => {


  return (
    <aside
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >


      {/* SpeakUp */}
      {mode === "speakup" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <SpeakUpContent
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            wagmiConfig={wagmiConfig}
            constants={constants}
          />
        </div>
      )}

      {/* Atom – scroll externe car l'intérieur est partiellement fixe */}
      {mode === "atom" && (
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0, scrollbarWidth: "thin", scrollbarColor: "rgba(255,211,42,0.3) transparent" }}>
          <AtomContent
            atomDetails={selectedAtomDetails}
            claims={selectedClaims}
            connections={{ follows: [], followers: [] }}
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            publicClient={wagmiConfig?.publicClient}
            loading={selectedLoading}
            error={selectedError}
            title="Claims"
          />
        </div>
      )}

      {/* Profile – pas de scroll externe, seulement les listes internes */}
      {mode === "profile" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <ProfileContent
            atomDetails={myAtomDetails}
            connections={myConnections}
            activities={myActivities}
            positions={myPositions}
            triples={myTriples}
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            publicClient={wagmiConfig?.publicClient}
            loading={sidebarLoading}
            error={sidebarError}
            constants={constants}
          />
        </div>
      )}
    </aside>
  );
};

export default RightPanel;

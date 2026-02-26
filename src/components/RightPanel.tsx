import React from "react";
import { RightPanelMode } from "./TopNavBar";
import { ClaimVoting } from "./vote/ClaimVoting";
import { SpeakUpHeader } from "./vote/SpeakUpHeader";
import AtomDetailsSection from "./graph/AtomDetailsSection";
import ClaimsSection from "./graph/ClaimsSection";
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
        <ClaimsSection
          activities={claims}
          title={title}
          walletAddress={walletAddress}
          walletConnected={walletConnected}
          publicClient={publicClient}
        />
      </div>
    </div>
  );
};

// ─── Contenu "Mode Profil" ──────────────────────────────────────────────────────

const ProfileContent: React.FC<{
  atomDetails: any;
  connections: { follows: any[]; followers: any[] };
  activities: any[];
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
  loading?: boolean;
  error?: string | null;
}> = ({
  atomDetails,
  connections,
  activities,
  walletAddress,
  walletConnected,
  publicClient,
  loading,
  error,
}) => {
  if (loading) return <p style={{ padding: 20, color: "#aaa" }}>Loading…</p>;
  if (error) return <p style={{ padding: 20, color: "#f87171" }}>{error}</p>;
  if (!atomDetails)
    return (
      <p style={{ padding: 20, color: "#aaa", fontSize: 14 }}>
        Connect your wallet to view your profile.
      </p>
    );

  return (
    <div style={{ padding: "0 16px 16px" }}>
      {/* Entête Atom */}
      <AtomDetailsSection
        atomDetails={atomDetails}
        connections={connections}
        walletAddress={walletAddress}
      />

      {/* Mes Claims */}
      <div style={{ marginTop: 16 }}>
        <ClaimsSection
          activities={activities}
          title="My Claims"
          walletAddress={walletAddress}
          walletConnected={walletConnected}
          publicClient={publicClient}
        />
      </div>

      {/* Positions & Activité côte à côte */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <PositionsSection
            accountId={walletAddress || ""}
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            publicClient={publicClient}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ActivitySection accountId={walletAddress || ""} />
        </div>
      </div>
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


      {/* Contenu scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
          // Scrollbar discrète
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,211,42,0.3) transparent",
        }}
      >
        {mode === "speakup" && (
          <SpeakUpContent
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            wagmiConfig={wagmiConfig}
            constants={constants}
          />
        )}

        {mode === "atom" && (
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
        )}

        {mode === "profile" && (
          <ProfileContent
            atomDetails={myAtomDetails}
            connections={myConnections}
            activities={myActivities}
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            publicClient={wagmiConfig?.publicClient}
            loading={sidebarLoading}
            error={sidebarError}
          />
        )}
      </div>
    </aside>
  );
};

export default RightPanel;

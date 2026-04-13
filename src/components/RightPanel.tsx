import React, { useState } from "react";
import { FaUser } from "react-icons/fa";
import { RightPanelMode } from "./TopNavBar";
import { ClaimVoting } from "./vote/ClaimVoting";
import { SpeakUpHeader } from "./vote/SpeakUpHeader";
import AtomDetailsSection from "./graph/AtomDetailsSection";
import ClaimsSection from "./graph/ClaimsSection";
import AtomClaimsSection from "./graph/AtomClaimsSection";
import PositionsSection from "./graph/PositionsSection";
import ActivitySection from "./graph/ActivitySection";
import { Network } from "../hooks/useAtomData";
import { useGameStats } from "../hooks/useGameStats";
import tripleSvg from "../assets/img/triple.svg";
import styles from "./RightPanel.module.css";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RightPanelProps {
  mode: RightPanelMode;

  // wallet
  walletAddress?: string;
  walletConnected?: any;
  wagmiConfig?: any;

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
  myPositions?: any[];
}> = ({
  atomDetails,
  claims,
  myPositions = [],
  connections,
  walletAddress,
  walletConnected,
  publicClient,
  loading,
  error,
  title = "Attestation",
}) => {
  if (loading) return <p className={styles.stateMessage}>Loading…</p>;
  if (error) return <p className={styles.stateMessageError}>{error}</p>;
  if (!atomDetails)
    return (
      <p className={styles.stateMessage}>
        Click on a graph node to view its details.
      </p>
    );

  return (
    <div className={styles.atomContent}>
      <AtomDetailsSection
        atomDetails={atomDetails}
        connections={connections}
        walletAddress={walletAddress}
      />
      <div>
        <AtomClaimsSection
          claims={claims}
          myPositions={myPositions}
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
  imageSrc?: string;
}> = ({ label, value, gradient, imageSrc }) => (
  <div className={styles.statsRow}>
    <span className={styles.statLabel}>{label}</span>
    <span className={styles.statValue}>{value}</span>
    {imageSrc ? (
      <img src={imageSrc} alt={label} className={styles.statImage} />
    ) : gradient ? (
      <div className={styles.statBar} style={{ background: gradient }} />
    ) : null}
  </div>
);

// ─── Séparateur de section ────────────────────────────────────────────────────────

const SectionDivider: React.FC<{ title: string }> = ({ title }) => (
  <div className={styles.sectionDividerRow}>
    <span className={styles.sectionDividerTitle}>{title}</span>
    <div className={styles.sectionDividerLine} />
  </div>
);

// ─── Onglets Positions / Activity ────────────────────────────────────────────

const ProfileTabs: React.FC<{
  walletAddress?: string;
  walletConnected?: any;
  publicClient?: any;
}> = ({ walletAddress, walletConnected, publicClient }) => {
  const [activeTab, setActiveTab] = useState<"positions" | "activity">("positions");

  return (
    <div className={styles.tabsContainer}>
      {/* ── En-têtes onglets ─── */}
      <div className={styles.tabHeaders}>
        <button
          className={`${styles.tab} ${activeTab === "positions" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("positions")}
        >
          My Positions
        </button>
        <button
          className={`${styles.tab} ${activeTab === "activity" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          Activity History
        </button>
      </div>

      {/* ── Contenu avec scrollbar ─── */}
      <div className={styles.tabContent}>
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
}) => {
  if (loading) return <p className={styles.stateMessage}>Loading…</p>;
  if (error) return <p className={styles.stateMessageError}>{error}</p>;
  if (!atomDetails)
    return (
      <p className={styles.stateMessage}>
        Connect your wallet to view your profile.
      </p>
    );

  // ── Stats calculées depuis les claims ──────────────────────────────────────────
  const totalVotes = positions.length; // Nombre de positions dans "my positions"
  const totalAttestations = activities.reduce(
    (sum, a) => sum + (a.term?.positions_aggregate?.aggregate?.count || 0) + (a.counter_term?.positions_aggregate?.aggregate?.count || 0),
    0
  );
  
  // Calculer la valeur totale et le nombre de dépôts
  const totalValueRaw = positions.reduce((sum, p) => sum + (p.shares ? Number(p.shares) : 0), 0);
  
  // Formater la valeur totale (convertir de wei à ETH et formater)
  const formatValue = (value: number): string => {
    // Convertir de wei à ETH (diviser par 10^18)
    const eth = value / 1e18;
    
    if (eth >= 1e9) return `${(eth / 1e9).toFixed(2)}B`;
    if (eth >= 1e6) return `${(eth / 1e6).toFixed(2)}M`;
    if (eth >= 1e3) return `${(eth / 1e3).toFixed(2)}K`;
    if (eth >= 1) return eth.toFixed(2);
    if (eth >= 0.01) return eth.toFixed(4);
    return eth.toFixed(6);
  };
  
  const totalValue = formatValue(totalValueRaw);
  
  const totalDeposits = positions.reduce((sum, p) => {
    const depositCount = p.vault?.deposits?.length || 0;
    return sum + depositCount;
  }, 0);

  return (
    <div className={styles.profileContent}>
      {/* ── Header joueur ───────────────────────────────────────────────────── */}
      <div className={styles.profileHeader}>
      <AtomDetailsSection
        atomDetails={atomDetails}
        connections={connections}
        walletAddress={walletAddress}
        showDescription={false}
        placeholderElement={<FaUser size={60} color="#ffd32a" />}
      />
      </div>

      {/* ── Bloc de stats ──────────────────────────────────────────────────── */}
      <div className={styles.profileHeader}>
      <div className={styles.statsBlock}>
        <PlayerStatBlock
          label="Votes"
          value={totalVotes}
          gradient="linear-gradient(to right, #3b82f6, #f97316)"
        />
        <div className={styles.statsDivider} />
        <PlayerStatBlock
          label="Attestation"
          value={totalAttestations}
          imageSrc={tripleSvg}
        />
        <div className={styles.statsDivider} />
        <PlayerStatBlock
          label="Value"
          value={totalValue}
          gradient="linear-gradient(to right, #a78bfa, #ec4899)"
        />
      </div>
      </div>

      {/* ── Mes Attestations ──────────────────────────────────────────────────────── */}
      <div className={styles.sectionDivider}>
      <SectionDivider title="My Attestations" />
      <ClaimsSection
        activities={activities}
        title=""
        walletAddress={walletAddress}
        walletConnected={walletConnected}
        publicClient={publicClient}
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
}> = ({ walletAddress, walletConnected, wagmiConfig }) => {
  const stats = useGameStats(Network.MAINNET);

  return (
    <div className={styles.speakUpContent}>
      <SpeakUpHeader stats={stats} />
      <div className={styles.speakUpBody}>
        <ClaimVoting
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          publicClient={wagmiConfig?.publicClient}
          network={Network.MAINNET}
          wagmiConfig={wagmiConfig}
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
    <aside className={styles.panel}>

      {/* SpeakUp */}
      {mode === "speakup" && (
        <div className={styles.modeSlot}>
          <SpeakUpContent
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            wagmiConfig={wagmiConfig}
          />
        </div>
      )}

      {/* Atom – scroll externe car l'intérieur est partiellement fixe */}
      {mode === "atom" && (
        <div className={styles.modeSlotScrollable}>
          <AtomContent
            atomDetails={selectedAtomDetails}
            claims={selectedClaims}
            myPositions={myPositions}
            connections={{ follows: [], followers: [] }}
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            publicClient={wagmiConfig?.publicClient}
            loading={selectedLoading}
            error={selectedError}
            title="Attestations"
          />
        </div>
      )}

      {/* Profile – pas de scroll externe, seulement les listes internes */}
      {mode === "profile" && (
        <div className={styles.modeSlot}>
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
          />
        </div>
      )}
    </aside>
  );
};

export default RightPanel;

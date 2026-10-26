import React, { useState } from "react";
import FollowButton from "./graph/FollowButton";
import { RightPanelMode } from "./TopNavBar";
import { ClaimVoting } from "./vote/ClaimVoting";
import { CampaignVoting } from "./vote/CampaignVoting";
import { SpeakUpHeader } from "./vote/SpeakUpHeader";
import AtomDetailsSection from "./graph/AtomDetailsSection";
import ClaimsSection from "./graph/ClaimsSection";
import AtomClaimsSection from "./graph/AtomClaimsSection";
import PositionsSection from "./graph/PositionsSection";
import ActivitySection from "./graph/ActivitySection";
import { Network } from "../hooks/useAtomData";
import { useGameStats } from "../hooks/useGameStats";
import { useGameContext } from "../contexts/GameContext";
import { useCampaigns } from "../hooks/useCampaigns";
import { FEEDBACK_SCORE_TYPES_ORDER, SCORE_TYPE_LABEL, FeedbackScoreType } from "../config/scoreType";
import { usePlayerArchetype } from "../missions/global/archetype/hooks/usePlayerArchetype";
import tripleSvg from "../assets/img/triple.svg";
import defaultAvatar from "./img/user-icon.png";
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
  myConnections?: { follows: any[]; followers: any[]; followingCount: number; followersCount: number };
  sidebarLoading?: boolean;
  sidebarError?: string | null;

  // données "atom sélectionné"
  selectedAtomDetails?: any;
  selectedClaims?: any[];
  selectedLoading?: boolean;
  selectedError?: string | null;

  // données "profil autre joueur"
  otherPlayerAtomDetails?: any;
  otherPlayerWallet?: string | null;
  otherPlayerPositions?: any[];
  otherPlayerActivities?: any[];
  otherPlayerConnections?: { followingCount: number; followersCount: number };
  otherPlayerLoading?: boolean;
  otherPlayerError?: string | null;
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
    <span className={styles.statValue}>{value}</span>
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
       {/*
      <div className={styles.tabHeaders}>
        <button
          className={`${styles.tab} ${activeTab === "positions" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("positions")}
        >
          My Positions
        </button>
       
        
        <button
          className={styles.tabActive}
        >
          Activity History
        </button>
      </div>
          */}

      {/* ── Contenu avec scrollbar ─── */}
      <div className={styles.tabContent}>
            {/*
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
          */}
          <ActivitySection accountId={walletAddress || ""} />
      </div>
    </div>
  );
};

// ─── Contenu "Mode Profil" ──────────────────────────────────────────────────────

const ProfileContent: React.FC<{
  atomDetails: any;
  connections: { follows: any[]; followers: any[]; followingCount: number; followersCount: number };
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
  const { archetype } = usePlayerArchetype(walletAddress);
  const [activeChoice, setActiveChoice] = useState<"ecosystem" | "player" | "activity">("ecosystem");
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
        connections={{
          follows: [],
          followers: [],
          followingCount: connections?.followingCount ?? 0,
          followersCount: connections?.followersCount ?? 0,
        }}
        walletAddress={walletAddress}
        showDescription={false}
        placeholderElement={<img src={defaultAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />}
        cosmeticBadge={
          archetype?.cosmetics?.[0]
            ? { ...archetype.cosmetics[0], description: archetype.description }
            : null
        }
      />
    
      </div>
      <div className={styles.navProfil}>
  <button
    className={`${styles.choice} ${
      activeChoice === "ecosystem" ? styles.choiceActive : ""
    }`}
    onClick={() => setActiveChoice("ecosystem")}
  >
    Ecosystem
  </button>

  <button
    className={`${styles.choice} ${
      activeChoice === "player" ? styles.choiceActive : ""
    }`}
    onClick={() => setActiveChoice("player")}
  >
    Player
  </button>

  <button
    className={`${styles.choice} ${
      activeChoice === "activity" ? styles.choiceActive : ""
    }`}
    onClick={() => setActiveChoice("activity")}
  >
    Activity
  </button>
</div>

{activeChoice === "ecosystem" && (
  <div className={styles.choiceEcosystem}>
<div className={styles.profileHeaderContainer}>
      
      <div className={styles.statsRowContainer}>

      <div className={styles.statContainer}>
          <span className={styles.labelStat}>Votes</span>
          <PlayerStatBlock
          label="Votes"
          value={totalVotes}
          gradient="linear-gradient(to right, #3b82f6, #f97316)"
        />
        </div>
        <div className={styles.statContainer}>
        <span className={styles.labelStat}>Attestations</span>
        <PlayerStatBlock
          label="Attestation"
          value={totalAttestations}
          imageSrc={tripleSvg}
        />
          </div>
        <div className={styles.statContainer}>
          <span className={styles.labelStat}>Value</span>
          <PlayerStatBlock
          label="Value"
          value={totalValue}
          gradient="linear-gradient(to right, #a78bfa, #ec4899)"
        />
        </div>
      </div>
 
      </div>
  </div>
)}

{activeChoice === "player" && (
  <div className={styles.choicePlayer}>
     <ClaimsSection
        activities={activities}
        title=""
      />
  </div>
)}

{activeChoice === "activity" && (
  <div className={styles.choiceActivity}>
    <ProfileTabs
        walletAddress={walletAddress}
        walletConnected={walletConnected}
        publicClient={publicClient}
      />
  </div>
)}

    </div>
  );
};

// ─── Contenu "Mode Profil Autre Joueur" ────────────────────────────────────────

const OtherPlayerProfileContent: React.FC<{
  atomDetails: any;
  activities: any[];
  positions?: any[];
  walletAddress?: string | null;
  connections?: { followingCount: number; followersCount: number };
  loading?: boolean;
  error?: string | null;
  myAccountAtomId?: string | null;
  walletConnected?: any;
  publicClient?: any;
  currentWalletAddress?: string;
  myPositions?: any[];
}> = ({ atomDetails, activities, positions = [], walletAddress, connections, loading, error, myAccountAtomId, walletConnected, publicClient, currentWalletAddress, myPositions = [] }) => {
  const { archetype } = usePlayerArchetype(walletAddress ?? undefined);
  if (loading) return <p className={styles.stateMessage}>Loading…</p>;
  if (error) return <p className={styles.stateMessageError}>{error}</p>;
  if (!atomDetails)
    return <p className={styles.stateMessage}>Select a player to view their profile.</p>;

  const totalVotes = positions.length;
  const totalAttestations = activities.reduce(
    (sum, a) => sum + (a.term?.positions_aggregate?.aggregate?.count || 0) + (a.counter_term?.positions_aggregate?.aggregate?.count || 0),
    0
  );
  const totalValueRaw = positions.reduce((sum, p) => sum + (p.shares ? Number(p.shares) : 0), 0);
  const formatValue = (value: number): string => {
    const eth = value / 1e18;
    if (eth >= 1e9) return `${(eth / 1e9).toFixed(2)}B`;
    if (eth >= 1e6) return `${(eth / 1e6).toFixed(2)}M`;
    if (eth >= 1e3) return `${(eth / 1e3).toFixed(2)}K`;
    if (eth >= 1) return eth.toFixed(2);
    if (eth >= 0.01) return eth.toFixed(4);
    return eth.toFixed(6);
  };
  const totalValue = formatValue(totalValueRaw);

  return (
    <div className={styles.profileContent}>
      <div className={styles.profileHeader}>
      <AtomDetailsSection
  atomDetails={atomDetails}
  connections={{
    follows: [],
    followers: [],
    followingCount: connections?.followingCount ?? 0,
    followersCount: connections?.followersCount ?? 0,
  }}
  walletAddress={undefined}
  showDescription={false}
  placeholderElement={<img src={defaultAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />}
  cosmeticBadge={
    archetype?.cosmetics?.[0]
      ? {
          ...archetype.cosmetics[0],
          description: archetype.description,
        }
      : null
  }
  actionElement={
    <FollowButton
      walletConnected={walletConnected}
      walletAddress={currentWalletAddress}
      publicClient={publicClient}
      myAccountAtomId={myAccountAtomId ?? null}
      otherAccountAtomId={atomDetails?.term_id ?? null}
    />
  }
/>
       
      </div>

      <div className={styles.profileHeaderContainer}>
      <div className={styles.statsRowContainer}>
         {/* Guild Stat -----------------------------
          <span className={styles.label}>Guild</span>
          <StatCard label="Guild(s)"       value={totalGuilds}       loading={false}   variant="guild" />
        */}


        <div className={styles.statContainer}>
          <span className={styles.labelStat}>Votes</span>
          <PlayerStatBlock
            label="Votes"
            value={totalVotes}
            gradient="linear-gradient(to right, #3b82f6, #f97316)"
          />
        </div>

        <div className={styles.statContainer}>
        <span className={styles.labelStat}>Attestations</span>
        <PlayerStatBlock
            label="Attestation"
            value={totalAttestations}
            imageSrc={tripleSvg}
          />
          </div>

        <div className={styles.statContainer}>
          <span className={styles.labelStat}>Value</span>
          <PlayerStatBlock
            label="Value"
            value={totalValue}
            gradient="linear-gradient(to right, #a78bfa, #ec4899)"
          />
        </div>

</div>



       
      </div>

      <div className={styles.sectionDivider}>
        <ClaimsSection
          activities={activities}
          title=""
          walletAddress={currentWalletAddress}
          walletConnected={walletConnected}
          publicClient={publicClient}
          myPositions={myPositions}
        />
      </div>
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
  const { activeGame } = useGameContext();
  const { campaigns } = useCampaigns(activeGame?.atomId);
  const hasActiveCampaign = campaigns.some((c) => c.status === "Active");
  const [activeTab, setActiveTab] = useState<"feedback" | "campaign">("feedback");
  // Shared across both tabs — a dimension picked on Feedback stays selected
  // when switching to Campaign, and vice versa.
  const [selectedScoreType, setSelectedScoreType] = useState<FeedbackScoreType | "all">("all");

  return (
    <div className={styles.speakUpContent}>
      <SpeakUpHeader stats={stats} />

      <div className={styles.speakUpTabsRow}>
        <div className={styles.speakUpTabs}>
          <button
            className={`${styles.speakUpTab} ${activeTab === "feedback" ? styles.speakUpTabActive : ""}`}
            onClick={() => setActiveTab("feedback")}
          >
            Feedback
          </button>
          <button
            className={`${styles.speakUpTab} ${activeTab === "campaign" ? styles.speakUpTabActive : ""}`}
            onClick={() => setActiveTab("campaign")}
          >
            Campaign
            {hasActiveCampaign && <span className="pm-live-dot" />}
          </button>
        </div>

        <select
          className={styles.scoreTypeSelect}
          value={selectedScoreType}
          onChange={(e) => setSelectedScoreType(e.target.value as FeedbackScoreType | "all")}
        >
          <option value="all">All</option>
          {FEEDBACK_SCORE_TYPES_ORDER.map((t) => (
            <option key={t} value={t}>{SCORE_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>

      <div className={styles.speakUpBody}>
        {activeTab === "feedback" ? (
          <ClaimVoting
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            publicClient={wagmiConfig?.publicClient}
            network={Network.MAINNET}
            wagmiConfig={wagmiConfig}
            selectedScoreType={selectedScoreType}
          />
        ) : (
          <CampaignVoting
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            publicClient={wagmiConfig?.publicClient}
            network={Network.MAINNET}
            wagmiConfig={wagmiConfig}
            selectedScoreType={selectedScoreType}
          />
        )}
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
  myConnections = { follows: [], followers: [], followingCount: 0, followersCount: 0 },
  sidebarLoading,
  sidebarError,
  selectedAtomDetails,
  selectedClaims = [],
  selectedLoading,
  selectedError,
  otherPlayerAtomDetails,
  otherPlayerWallet,
  otherPlayerPositions = [],
  otherPlayerActivities = [],
  otherPlayerConnections,
  otherPlayerLoading,
  otherPlayerError,
}) => {


  return (
    <aside className={styles.panel}>
      {/* <div className={styles.haloBottom} /> */}
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

      {/* Player Profile – profil d'un autre joueur */}
      {mode === "player-profile" && (
        <div className={styles.modeSlot}>
          <OtherPlayerProfileContent
            atomDetails={otherPlayerAtomDetails}
            activities={otherPlayerActivities}
            positions={otherPlayerPositions}
            walletAddress={otherPlayerWallet}
            connections={otherPlayerConnections}
            loading={otherPlayerLoading}
            error={otherPlayerError}
            myAccountAtomId={myAtomDetails?.term_id ?? null}
            walletConnected={walletConnected}
            publicClient={wagmiConfig?.publicClient}
            currentWalletAddress={walletAddress}
            myPositions={myPositions}
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

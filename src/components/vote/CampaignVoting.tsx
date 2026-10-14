import React, { useState, useEffect, useMemo } from "react";
import { Network } from "../../hooks/useAtomData";
import { useSubmitVotes } from "../../hooks/useSubmitVotes";
import { useVoteItemsManagement } from "../../hooks/useVoteItemsManagement";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useCountdown } from "../../hooks/useCountdown";
import { TransactionInfo } from "./TransactionInfo";
import { CampaignGroupedList } from "./CampaignGroupedList";
import { CampaignTabs } from "./CampaignTabs";
import { TransactionStatusDisplay } from "./TransactionStatus";
import { ConnectWalletModal } from "../modals";
import { usePositions } from "../../hooks/usePositions";
import { useGameContext } from "../../contexts/GameContext";
import { PREDICATES } from "../../utils/constants";
import { useNetworkCheck } from "../../shared/hooks/useNetworkCheck";
import { NetworkSwitchMessage } from "../../shared/components/NetworkSwitchMessage";
import { FeedbackScoreType } from "../../config/scoreType";
import styles from "./CampaignVoting.module.css";

interface CampaignVotingProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  network?: Network;
  onConnectWallet?: () => void;
  wagmiConfig?: any;
  // Shared with Feedback via RightPanel — see ClaimVotingProps.
  selectedScoreType?: FeedbackScoreType | "all";
}

export const CampaignVoting: React.FC<CampaignVotingProps> = ({
  walletConnected,
  walletAddress,
  publicClient,
  network = Network.MAINNET,
  onConnectWallet,
  wagmiConfig,
  selectedScoreType = "all",
}) => {
  const [isWalletReady, setIsWalletReady] = useState(false);

  const { activeGame } = useGameContext();
  const gameAtomId = activeGame?.atomId;

  // Same wallet/player gating as ClaimVoting — duplicated inline rather than
  // extracted (~20 lines, not worth a shared hook for one other call site).
  const { positions: activePositions, loading: positionsLoading } =
    usePositions(walletAddress || undefined, network);

  const hasPlayerAtom = useMemo(
    () => activePositions.some((p: any) =>
      p.term?.triple?.predicate_id === PREDICATES.IS_PLAYER_OF &&
      p.term?.triple?.object_id === gameAtomId
    ),
    [activePositions, gameAtomId],
  );

  useEffect(() => {
    const hasConnectedWallet = Boolean(walletAddress && walletAddress !== "");
    setIsWalletReady(hasConnectedWallet);
  }, [walletAddress]);

  const { campaigns, isLoading: campaignsLoading } = useCampaigns(gameAtomId);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Default tab: the Active campaign if there is one (you can vote right
  // now), else the Draft launching soonest, else the most recent version.
  // Re-runs whenever the current selection no longer points at a real
  // campaign in the list (first load, or the list changed under it).
  useEffect(() => {
    if (campaigns.length === 0) return;
    if (selectedCampaignId && campaigns.some((c) => c.id === selectedCampaignId)) return;

    const active = campaigns.find((c) => c.status === "Active");
    const soonestDraft = [...campaigns]
      .filter((c) => c.status === "Draft")
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
    const mostRecent = [...campaigns].sort((a, b) => b.sequence_number - a.sequence_number)[0];

    setSelectedCampaignId((active ?? soonestDraft ?? mostRecent).id);
  }, [campaigns, selectedCampaignId]);

  const campaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  const isActive = campaign?.status === "Active";
  const { label: countdownLabel, hasStarted } = useCountdown(campaign?.start_date);

  // Only a real, non-empty triple list when voting is actually allowed
  // (Active campaign selected) — Draft campaigns show a countdown only, no
  // vote controls, since a deposit made before start_date is never counted
  // by the backend's campaign-results window anyway.
  const tripleIdsOverride = useMemo(
    () => (isActive ? campaign!.attestations.map((a) => a.triple_id) : []),
    [isActive, campaign]
  );

  const {
    voteItems,
    isLoading,
    totalUnits,
    numberOfTransactions,
    handleChangeUnits,
    resetAllVotes,
    refreshPositions,
    isVoteDirectionAllowed,
  } = useVoteItemsManagement({
    network,
    walletAddress,
    tripleIdsOverride,
    scoreTypeOverride: isActive
      ? Object.fromEntries(campaign!.attestations.map((a) => [a.triple_id, a.score_type ?? undefined]))
      : undefined,
    typeOverride: isActive
      ? Object.fromEntries(campaign!.attestations.map((a) => [a.triple_id, a.type]))
      : undefined,
    positionWindowOverride: isActive
      ? { start: campaign!.start_date, end: campaign!.end_date }
      : undefined,
    onError: (message) => {
      setTransactionStatus({ status: "error", message });
    },
  });

  const {
    submitVotes,
    isSubmitting,
    isDepositLoading,
    transactionStatus,
    setTransactionStatus,
  } = useSubmitVotes({
    walletConnected,
    walletAddress,
    publicClient,
    network,
    onSuccess: () => { resetAllVotes(); refreshPositions(); },
  });

  const handleSubmit = async () => {
    await submitVotes(voteItems);
  };

  const filteredVoteItems =
    selectedScoreType === "all" ? voteItems : voteItems.filter((i) => i.score_type === selectedScoreType);

  const { isCorrectNetwork, currentChainId, targetChainId, allowedChainIds } = useNetworkCheck({
    walletConnected,
    publicClient,
  });

  if (!isWalletReady) {
    return (
      <div className={styles.walletPrompt}>
        <ConnectWalletModal
          isOpen={true}
          onConnectWallet={onConnectWallet || (() => {})}
        />
      </div>
    );
  }

  if (isWalletReady && !hasPlayerAtom && !positionsLoading) {
    return null;
  }

  if (campaignsLoading) {
    return <div className={styles.skeleton} />;
  }

  if (campaigns.length === 0) {
    return <p className={styles.emptyState}>No campaign right now.</p>;
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className={styles.root}>
      <CampaignTabs
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        onSelect={setSelectedCampaignId}
      />

      {isActive && campaign.description && (
        <div className={styles.campaignHeader}>
          <p className={styles.description}>{campaign.description}</p>
        </div>
      )}

      {isActive ? (
        <>
          <div className={styles.scrollList} data-scroll-list>
            <CampaignGroupedList
              isLoading={isLoading}
              voteItems={filteredVoteItems}
              onChangeUnits={handleChangeUnits}
              isVoteDirectionAllowed={isVoteDirectionAllowed}
              walletAddress={walletAddress}
              network={network}
            />
          </div>

          <div className={styles.footer}>
            <TransactionInfo
              numberOfTransactions={numberOfTransactions}
              totalUnits={totalUnits}
              onResetAll={resetAllVotes}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isDepositLoading={isDepositLoading}
            />
            <TransactionStatusDisplay
              transactionStatus={transactionStatus}
              onDismiss={() => setTransactionStatus({ status: "idle", message: "" })}
            />
            {!isCorrectNetwork && (
              <NetworkSwitchMessage
                allowedChainIds={allowedChainIds}
                currentChainId={currentChainId}
                targetChainId={targetChainId}
              />
            )}
          </div>
        </>
      ) : (
        <div className={styles.draftCountdown}>
          <span className={styles.draftCountdownValue}>
            {hasStarted ? "Starting…" : countdownLabel}
          </span>
          <span className={styles.draftCountdownLabel}>until voting opens</span>
        </div>
      )}
    </div>
  );
};

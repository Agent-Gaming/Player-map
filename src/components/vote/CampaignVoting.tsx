import React, { useState, useEffect, useMemo } from "react";
import { Network } from "../../hooks/useAtomData";
import { useSubmitVotes } from "../../hooks/useSubmitVotes";
import { useVoteItemsManagement } from "../../hooks/useVoteItemsManagement";
import { useCampaigns } from "../../hooks/useCampaigns";
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

  const { campaigns: allCampaigns, isLoading: campaignsLoading } = useCampaigns(gameAtomId);
  // Upcoming (Draft) campaigns aren't shown at all — only one a player can
  // actually act on right now.
  const campaigns = useMemo(() => allCampaigns.filter((c) => c.status === "Active"), [allCampaigns]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Default tab: the lowest sequence_number Active campaign. Re-runs
  // whenever the current selection no longer points at a real campaign in
  // the list (first load, or the list changed under it).
  useEffect(() => {
    if (campaigns.length === 0) return;
    if (selectedCampaignId && campaigns.some((c) => c.id === selectedCampaignId)) return;

    const first = [...campaigns].sort((a, b) => a.sequence_number - b.sequence_number)[0];
    setSelectedCampaignId(first.id);
  }, [campaigns, selectedCampaignId]);

  const campaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;

  const tripleIdsOverride = useMemo(
    () => (campaign ? campaign.attestations.map((a) => a.triple_id) : []),
    [campaign]
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
    scoreTypeOverride: campaign
      ? Object.fromEntries(campaign.attestations.map((a) => [a.triple_id, a.score_type ?? undefined]))
      : undefined,
    typeOverride: campaign
      ? Object.fromEntries(campaign.attestations.map((a) => [a.triple_id, a.type]))
      : undefined,
    voterCountOverride: campaign
      ? Object.fromEntries(
          campaign.attestations.map((a) => [a.triple_id, { for_voters: a.for_voters, against_voters: a.against_voters }])
        )
      : undefined,
    positionWindowOverride: campaign
      ? { start: campaign.start_date, end: campaign.end_date }
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
    </div>
  );
};

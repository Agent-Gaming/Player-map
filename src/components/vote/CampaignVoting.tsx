import React, { useState, useEffect, useMemo } from "react";
import { Network } from "../../hooks/useAtomData";
import { useSubmitVotes } from "../../hooks/useSubmitVotes";
import { useVoteItemsManagement } from "../../hooks/useVoteItemsManagement";
import { useCampaigns } from "../../hooks/useCampaigns";
import { TransactionInfo } from "./TransactionInfo";
import { ClaimList } from "./ClaimList";
import { CampaignList } from "./CampaignList";
import { Countdown } from "./Countdown";
import { TransactionStatusDisplay } from "./TransactionStatus";
import { ConnectWalletModal } from "../modals";
import { usePositions } from "../../hooks/usePositions";
import { useGameContext } from "../../contexts/GameContext";
import { PREDICATES } from "../../utils/constants";
import { useNetworkCheck } from "../../shared/hooks/useNetworkCheck";
import { NetworkSwitchMessage } from "../../shared/components/NetworkSwitchMessage";
import { DEV_STEP_LABEL, DEV_STEP_COLOR } from "../../config/devStep";
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

  // Auto-select the only campaign there is — a list with one row to click
  // through would just be an extra step.
  useEffect(() => {
    if (!selectedCampaignId && campaigns.length === 1) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  const campaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  const isActive = campaign?.status === "Active";

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
    return <CampaignList campaigns={campaigns} onSelect={setSelectedCampaignId} />;
  }

  return (
    <div className={styles.root}>
      {campaigns.length > 1 && (
        <button type="button" className={styles.backButton} onClick={() => setSelectedCampaignId(null)}>
          ‹ All campaigns
        </button>
      )}

      <div className={styles.campaignHeader}>
        <div className={styles.campaignHeaderTop}>
          <span
            className={styles.devStepBadge}
            style={{
              color: DEV_STEP_COLOR[campaign.dev_step],
              borderColor: `${DEV_STEP_COLOR[campaign.dev_step]}40`,
              background: `${DEV_STEP_COLOR[campaign.dev_step]}14`,
            }}
          >
            {DEV_STEP_LABEL[campaign.dev_step]}
          </span>
          <span className={styles.gameVersion}>v{campaign.game_version}</span>
          {isActive ? (
            <span className={styles.liveTag}>
              <span className="pm-live-dot" /> Live
            </span>
          ) : (
            <Countdown targetDate={campaign.start_date} />
          )}
        </div>
        {campaign.description && <p className={styles.description}>{campaign.description}</p>}
      </div>

      {isActive ? (
        <>
          <div className={styles.scrollList} data-scroll-list>
            <ClaimList
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
        <p className={styles.noVotes}>Voting opens when the campaign starts.</p>
      )}
    </div>
  );
};

import React, { useState } from "react";
import SafeImage from "../SafeImage";
import { useDepositTriple } from "../../hooks/useDepositTriple";
import { useRedeemBatch } from "../../hooks/useRedeemBatch";
import { Network } from "../../hooks/useAtomData";
import { VoteDirection } from "../../types/vote";
import { getAtomVerificationStatus } from "../../config/verifiedAtoms";
import upSvg from "../../assets/img/up.svg";
import downSvg from "../../assets/img/down.svg";
import upNotSelectedSvg from "../../assets/img/upNotSelected.svg";
import downNotSelectedSvg from "../../assets/img/downNotSelected.svg";
import styles from "./ClaimsSection.module.css";

interface ClaimActionRowProps {
  claim: any;
  walletAddress: string;
  walletConnected: any;
  publicClient?: any;
  // Map of term_id (lowercase) → { shares: bigint, curveId: bigint }
  positionsByTermId: Map<string, { shares: bigint; curveId: bigint }>;
}

const ClaimActionRow: React.FC<ClaimActionRowProps> = ({
  claim,
  walletAddress,
  walletConnected,
  publicClient,
  positionsByTermId,
}) => {
  const [error, setError] = useState<string | null>(null);

  const { depositTriple, isLoading: isDepositing } = useDepositTriple({
    walletConnected,
    walletAddress,
    publicClient,
    network: Network.MAINNET,
  });

  const { redeemBatch, isLoading: isRedeeming } = useRedeemBatch({
    walletConnected,
    walletAddress,
  });

  const isLoading = isDepositing || isRedeeming;

  const norm = (v: unknown) => String(v ?? "").toLowerCase();

  // For vault = triple's own term_id
  const forTermId = norm(claim.term?.id ?? claim.term_id);
  // Against vault = counter_term's term_id
  const againstTermId = norm(claim.counter_term?.id ?? claim.counter_term_id);

  const forPosition = forTermId ? positionsByTermId.get(forTermId) : undefined;
  const againstPosition = againstTermId ? positionsByTermId.get(againstTermId) : undefined;

  const hasVotedFor = Boolean(forPosition && forPosition.shares > 0n);
  const hasVotedAgainst = Boolean(againstPosition && againstPosition.shares > 0n);

  const forCount = claim.forCount ?? claim.term?.positions_aggregate?.aggregate?.count ?? 0;
  const againstCount = claim.againstCount ?? claim.counter_term?.positions_aggregate?.aggregate?.count ?? 0;

  const handleForClick = async () => {
    if (isLoading) return;
    setError(null);
    const claimId = claim.term_id ?? claim.term?.id;
    try {
      if (hasVotedFor && forPosition) {
        // Toggle off: redeem from for vault
        await redeemBatch({
          receiver: walletAddress as `0x${string}`,
          termIds: [forTermId as `0x${string}`],
          curveIds: [forPosition.curveId],
          shares: [forPosition.shares],
          minAssets: [0n],
        });
      } else if (hasVotedAgainst && againstPosition) {
        // Switch: redeem against, then deposit for
        await redeemBatch({
          receiver: walletAddress as `0x${string}`,
          termIds: [againstTermId as `0x${string}`],
          curveIds: [againstPosition.curveId],
          shares: [againstPosition.shares],
          minAssets: [0n],
        });
        await depositTriple([{ claimId: String(claimId), units: 1, direction: VoteDirection.For }]);
      } else {
        await depositTriple([{ claimId: String(claimId), units: 1, direction: VoteDirection.For }]);
      }
    } catch (err: any) {
      const msg = (err?.message ?? String(err)).toLowerCase();
      const isRejected = msg.includes('user rejected');
      setError(isRejected ? 'Cancelled.' : (err?.shortMessage ?? err?.message ?? String(err)));
    }
  };

  const handleAgainstClick = async () => {
    if (isLoading) return;
    setError(null);
    const claimId = claim.term_id ?? claim.term?.id;
    try {
      if (hasVotedAgainst && againstPosition) {
        // Toggle off: redeem from against vault
        await redeemBatch({
          receiver: walletAddress as `0x${string}`,
          termIds: [againstTermId as `0x${string}`],
          curveIds: [againstPosition.curveId],
          shares: [againstPosition.shares],
          minAssets: [0n],
        });
      } else if (hasVotedFor && forPosition) {
        // Switch: redeem for, then deposit against
        await redeemBatch({
          receiver: walletAddress as `0x${string}`,
          termIds: [forTermId as `0x${string}`],
          curveIds: [forPosition.curveId],
          shares: [forPosition.shares],
          minAssets: [0n],
        });
        await depositTriple([{ claimId: String(claimId), units: 1, direction: VoteDirection.Against }]);
      } else {
        await depositTriple([{ claimId: String(claimId), units: 1, direction: VoteDirection.Against }]);
      }
    } catch (err: any) {
      const msg = (err?.message ?? String(err)).toLowerCase();
      const isRejected = msg.includes('user rejected');
      setError(isRejected ? 'Cancelled.' : (err?.shortMessage ?? err?.message ?? String(err)));
    }
  };

  const objectVerif = getAtomVerificationStatus(claim.object_id ?? claim.object?.term_id);
  const showObjectImage = claim.object?.image && objectVerif.status !== 'not-verified';

  return (
    <div className={styles.claimRow}>
      {showObjectImage ? (
        <SafeImage
          src={claim.object.image}
          alt={claim.object?.label || ""}
          style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div className={styles.claimIconPlaceholder}>⚛</div>
      )}

      <span className={styles.claimLabel}>{claim.object?.label || "—"}</span>

      {error && <span style={{ fontSize: 10, color: "#ef4444" }}>{error}</span>}

      {/* For button */}
      <button
        className={styles.voteBtn}
        onClick={handleForClick}
        disabled={isLoading}
        title={hasVotedFor ? "Redeem for position" : "Vote for"}
      >
        <img
          src={hasVotedFor ? upSvg : upNotSelectedSvg}
          alt="for"
          className={styles.voteBtnIcon}
        />
        <span style={{ fontSize: 13, color: hasVotedFor ? "#006FE8" : "rgba(255,255,255,0.35)" }}>
          {forCount}
        </span>
      </button>

      {/* Against button */}
      <button
        className={styles.voteBtn}
        onClick={handleAgainstClick}
        disabled={isLoading}
        title={hasVotedAgainst ? "Redeem against position" : "Vote against"}
      >
        <img
          src={hasVotedAgainst ? downSvg : downNotSelectedSvg}
          alt="against"
          className={styles.voteBtnIcon}
        />
        <span style={{ fontSize: 13, color: hasVotedAgainst ? "#FF9500" : "rgba(255,255,255,0.35)" }}>
          {againstCount}
        </span>
      </button>
    </div>
  );
};

export default ClaimActionRow;

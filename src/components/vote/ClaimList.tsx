import React from "react";
import { VoteItem, VoteDirection } from "../../types/vote";
import { ClaimItem } from "./ClaimItem";
import { Network } from "../../hooks/useAtomData";
import styles from "./ClaimList.module.css";

interface ClaimListProps {
  isLoading: boolean;
  loadingProgress?: { loaded: number; total: number };
  voteItems: VoteItem[];
  onChangeUnits: (id: bigint, direction: VoteDirection, units: number) => void;
  isVoteDirectionAllowed?: (
    tripleId: bigint,
    direction: VoteDirection
  ) => boolean;
  walletAddress?: string;
  network?: Network;
}

export const ClaimList: React.FC<ClaimListProps> = ({
  isLoading,
  voteItems,
  onChangeUnits,
  isVoteDirectionAllowed,
  walletAddress = "",
  network = Network.MAINNET,
}) => {
  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        {Array.from({ length: 10 }).map((_, index) => (
          <div className={styles.skeletonRow} key={index}>
            <div className={styles.skeletonCircleSmall} />

            <div className={styles.skeletonBar} />

            <div className={styles.skeletonActions}>
              <div className={styles.skeletonCircle} />
              <div className={styles.skeletonCircle} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {voteItems.map((item) => (
        <ClaimItem
          key={item.id.toString()}
          voteItem={item}
          onChangeUnits={onChangeUnits}
          isVoteDirectionAllowed={isVoteDirectionAllowed}
          walletAddress={walletAddress}
          network={network}
        />
      ))}
    </div>
  );
};
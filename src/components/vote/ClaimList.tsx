import React from "react";
import { VoteItem, VoteDirection } from "../../types/vote";
import { ClaimItem } from "./ClaimItem";
import { Network } from "../../hooks/useAtomData";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
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
  constants: DefaultPlayerMapConstants; // Constantes injectées
}

export const ClaimList: React.FC<ClaimListProps> = ({
  isLoading,
  loadingProgress,
  voteItems,
  onChangeUnits,
  isVoteDirectionAllowed,
  walletAddress = "",
  network = Network.MAINNET,
  constants,
}) => {
  if (isLoading) {
    const progressText = loadingProgress
      ? `Loading claims... ${loadingProgress.loaded}/${loadingProgress.total}`
      : "Loading claims...";

    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingText}>{progressText}</div>
        {loadingProgress && (
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%` }}
            />
          </div>
        )}
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
          constants={constants} // Passer les constantes personnalisées !
        />
      ))}
    </div>
  );
};
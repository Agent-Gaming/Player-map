import React from "react";
import { VoteItem, VoteDirection } from "../../types/vote";
import { ClaimItem } from "./ClaimItem";
import { Network } from "../../hooks/useAtomData";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";

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
      <div
        style={{
          textAlign: "center",
          padding: "0px 20px",
          color: "#6b7280",
          fontSize: "1.1em",
        }}
      >
        <div style={{ marginBottom: "10px" }}>{progressText}</div>
        {loadingProgress && (
          <div
            style={{
              width: "100%",
              backgroundColor: "#374151",
              borderRadius: "4px",
              overflow: "hidden",
              marginTop: "10px",
            }}
          >
            <div
              style={{
                width: `${
                  (loadingProgress.loaded / loadingProgress.total) * 100
                }%`,
                height: "8px",
                backgroundColor: "#3b82f6",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ }}>
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
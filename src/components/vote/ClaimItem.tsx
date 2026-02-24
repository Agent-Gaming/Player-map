import React from "react";
import { VoteItem, VoteDirection } from "../../types/vote";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import { Network } from "../../hooks/useAtomData";
import upSvg from "../../assets/img/up.svg";
import downSvg from "../../assets/img/down.svg";
import upNotSelectedSvg from "../../assets/img/upNotSelected.svg";
import downNotSelectedSvg from "../../assets/img/downNotSelected.svg";

interface ClaimItemProps {
  voteItem: VoteItem;
  onChangeUnits: (id: bigint, direction: VoteDirection, units: number) => void;
  isVoteDirectionAllowed?: (
    tripleId: bigint,
    direction: VoteDirection
  ) => boolean;
  walletAddress?: string;
  network?: Network;
  constants: DefaultPlayerMapConstants;
}

export const ClaimItem: React.FC<ClaimItemProps> = ({
  voteItem,
  onChangeUnits,
  isVoteDirectionAllowed = () => true,
  walletAddress = "",
  network = Network.MAINNET,
  constants,
}) => {
  const {
    id,
    subject,
    predicate,
    object,
    subject_image,
    object_image,
    units = 0,
    direction = VoteDirection.None,
    term_position_count = 0,
    counter_term_position_count = 0,
    userHasPosition = false,
    userPositionDirection = VoteDirection.None,
  } = voteItem;

  // Sélection en cours (non soumise)
  const isSelectedFor = direction === VoteDirection.For && units > 0;
  const isSelectedAgainst = direction === VoteDirection.Against && units > 0;
  const hasSelection = isSelectedFor || isSelectedAgainst;

  // Position existante sur la blockchain
  const hasForPosition = userHasPosition && userPositionDirection === VoteDirection.For;
  const hasAgainstPosition = userHasPosition && userPositionDirection === VoteDirection.Against;
  const hasAnyPosition = userHasPosition && userPositionDirection !== VoteDirection.None;

  const canVoteFor = isVoteDirectionAllowed(id, VoteDirection.For);
  const canVoteAgainst = isVoteDirectionAllowed(id, VoteDirection.Against);

  const handleUpClick = () => {
    if (isSelectedFor) {
      // Désélectionner
      onChangeUnits(id, VoteDirection.None, 0);
    } else if (!isSelectedAgainst && canVoteFor) {
      onChangeUnits(id, VoteDirection.For, 1);
    }
  };

  const handleDownClick = () => {
    if (isSelectedAgainst) {
      // Désélectionner
      onChangeUnits(id, VoteDirection.None, 0);
    } else if (!isSelectedFor && canVoteAgainst) {
      onChangeUnits(id, VoteDirection.Against, 1);
    }
  };

  const upDisabled = !isSelectedFor && (isSelectedAgainst || !canVoteFor);
  const downDisabled = !isSelectedAgainst && (isSelectedFor || !canVoteAgainst);

  const rowBg = isSelectedFor
    ? "rgba(0, 111, 232, 0.15)"
    : isSelectedAgainst
    ? "rgba(255, 149, 0, 0.15)"
    : "transparent";

  const rowBorder = isSelectedFor
    ? "1px solid rgba(0, 111, 232, 0.6)"
    : isSelectedAgainst
    ? "1px solid rgba(255, 149, 0, 0.6)"
    : "1px solid rgba(255, 255, 255, 0)";

  return (
    <div
      style={{
        padding: "13px 20px",
        marginBottom: "10px",
        borderRadius: "8px",
        position: "relative",
        backgroundColor: rowBg,
        border: rowBorder,
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        transition: "background-color 0.2s ease, border 0.2s ease",
      }}
    >
      {/* Triple details */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "5px",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          title={subject}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            maxWidth: "160px",
            backgroundColor: "#2e2e2edc",
            padding: "4px 8px",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          {subject_image && (
            <img
              src={subject_image}
              alt=""
              style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
            />
          )}
          <span style={{ fontSize: "0.93em", color: "#D9D9D9", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subject}
          </span>
        </div>
        <span
          title={predicate}
          style={{
            display: "inline-block",
            maxWidth: "100px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            padding: "4px 8px",
            fontSize: "0.93em",
            color: "#D9D9D9",
            fontWeight: "bold",
          }}
        >
          {predicate}
        </span>
        <div
          title={object}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            maxWidth: "160px",
            backgroundColor: "#2e2e2edc",
            padding: "4px 8px",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          {object_image && (
            <img
              src={object_image}
              alt=""
              style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
            />
          )}
          <span style={{ fontSize: "0.93em", color: "#D9D9D9", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {object}
          </span>
        </div>
      </div>

      {/* Vote buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        {/* UP */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={upDisabled ? undefined : handleUpClick}
            disabled={upDisabled}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: upDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src={isSelectedFor || hasForPosition ? upSvg : upNotSelectedSvg}
              alt="vote up"
              style={{ width: 28, height: 28 }}
            />
          </button>
          <span
            style={{
              color: isSelectedFor || hasForPosition ? "#006FE8" : "rgba(255,255,255,0.7)",
              fontWeight: "bold",
              fontSize: "0.9em",
              minWidth: "24px",
              textAlign: "left",
            }}
          >
            {term_position_count}
          </span>
        </div>

        {/* DOWN */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={downDisabled ? undefined : handleDownClick}
            disabled={downDisabled}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: downDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src={isSelectedAgainst || hasAgainstPosition ? downSvg : downNotSelectedSvg}
              alt="vote down"
              style={{ width: 28, height: 28 }}
            />
          </button>
          <span
            style={{
              color: isSelectedAgainst || hasAgainstPosition ? "#FF9500" : "rgba(255,255,255,0.7)",
              fontWeight: "bold",
              fontSize: "0.9em",
              minWidth: "24px",
              textAlign: "left",
            }}
          >
            {counter_term_position_count}
          </span>
        </div>
      </div>
    </div>
  );
};

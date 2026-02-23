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
    term_position_count = 0,
    counter_term_position_count = 0,
    userHasPosition = false,
    userPositionDirection = VoteDirection.None,
  } = voteItem;

  const hasForPosition = userHasPosition && userPositionDirection === VoteDirection.For;
  const hasAgainstPosition = userHasPosition && userPositionDirection === VoteDirection.Against;
  const hasAnyPosition = userHasPosition && userPositionDirection !== VoteDirection.None;

  const canVoteFor = isVoteDirectionAllowed(id, VoteDirection.For);
  const canVoteAgainst = isVoteDirectionAllowed(id, VoteDirection.Against);

  const handleUpClick = () => {
    if (hasForPosition) {
      // Toggle off
      onChangeUnits(id, VoteDirection.None, 0);
    } else if (!hasAnyPosition && canVoteFor) {
      onChangeUnits(id, VoteDirection.For, 1);
    }
  };

  const handleDownClick = () => {
    if (hasAgainstPosition) {
      // Toggle off
      onChangeUnits(id, VoteDirection.None, 0);
    } else if (!hasAnyPosition && canVoteAgainst) {
      onChangeUnits(id, VoteDirection.Against, 1);
    }
  };

  const upDisabled = !hasForPosition && (hasAgainstPosition || !canVoteFor);
  const downDisabled = !hasAgainstPosition && (hasForPosition || !canVoteAgainst);

  return (
    <div
      style={{
        padding: "10px 20px",
        marginBottom: "10px",
        borderRadius: "8px",
        position: "relative",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderBottom: hasAnyPosition
          ? hasForPosition
            ? "12px solid #006FE8"
            : "12px solid #FF9500"
          : "1px solid rgb(105, 105, 105)",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
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
        <span
          title={subject}
          style={{
            display: "inline-block",
            maxWidth: "160px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            backgroundColor: "#FFB300",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.85em",
            color: "#000000",
            fontWeight: "bold",
          }}
        >
          {subject}
        </span>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8em" }}>–</span>
        <span
          title={predicate}
          style={{
            display: "inline-block",
            maxWidth: "100px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            backgroundColor: "#ccd3d3",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.85em",
            color: "#000000",
            fontWeight: "bold",
          }}
        >
          {predicate}
        </span>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8em" }}>–</span>
        <span
          title={object}
          style={{
            display: "inline-block",
            maxWidth: "160px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            backgroundColor: "#43A047",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.85em",
            color: "#000000",
            fontWeight: "bold",
          }}
        >
          {object}
        </span>
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
              opacity: upDisabled ? 0.35 : 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src={hasForPosition ? upSvg : upNotSelectedSvg}
              alt="vote up"
              style={{ width: 28, height: 28 }}
            />
          </button>
          <span
            style={{
              color: hasForPosition ? "#006FE8" : "rgba(255,255,255,0.7)",
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
              opacity: downDisabled ? 0.35 : 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src={hasAgainstPosition ? downSvg : downNotSelectedSvg}
              alt="vote down"
              style={{ width: 28, height: 28 }}
            />
          </button>
          <span
            style={{
              color: hasAgainstPosition ? "#FF9500" : "rgba(255,255,255,0.7)",
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

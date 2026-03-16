import React from "react";
import { VoteItem, VoteDirection } from "../../types/vote";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import { Network } from "../../hooks/useAtomData";
import styles from "./ClaimItem.module.css";
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

  const upDisabled = !isSelectedFor && (hasForPosition || isSelectedAgainst || hasAgainstPosition || !canVoteFor);
  const downDisabled = !isSelectedAgainst && (hasAgainstPosition || isSelectedFor || hasForPosition || !canVoteAgainst);

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
      className={`${styles.row} ${isSelectedFor ? styles.rowFor : isSelectedAgainst ? styles.rowAgainst : ''}`}
    >
      {/* Triple details */}
      <div className={styles.tripleWrapper}>
        <div
          title={subject}
          className={styles.pill}
        >
          {subject_image && (
            <img
              src={subject_image}
              alt=""
              className={styles.pillImage}
            />
          )}
          <span className={styles.pillLabel}>
            {subject}
          </span>
        </div>
        <span
          title={predicate}
          className={styles.predicate}
        >
          {predicate}
        </span>
        <div
          title={object}
          className={styles.pill}
        >
          {object_image && (
            <img
              src={object_image}
              alt=""
              className={styles.pillImage}
            />
          )}
          <span className={styles.pillLabel}>
            {object}
          </span>
        </div>
      </div>

      {/* Vote buttons */}
      <div className={styles.voteGroup}>
        {/* UP */}
        <div className={styles.voteItem}>
          <button
            onClick={upDisabled ? undefined : handleUpClick}
            disabled={upDisabled}
            className={styles.voteBtn}
          >
            <img
              src={isSelectedFor || hasForPosition ? upSvg : upNotSelectedSvg}
              alt="vote up"
              className={styles.voteIcon}
            />
          </button>
          <span
            className={`${styles.voteCount} ${(isSelectedFor || hasForPosition) ? styles.voteCountFor : styles.voteCountDefault}`}
          >
            {term_position_count}
          </span>
        </div>

        {/* DOWN */}
        <div className={styles.voteItem}>
          <button
            onClick={downDisabled ? undefined : handleDownClick}
            disabled={downDisabled}
            className={styles.voteBtn}
          >
            <img
              src={isSelectedAgainst || hasAgainstPosition ? downSvg : downNotSelectedSvg}
              alt="vote down"
              className={styles.voteIcon}
            />
          </button>
          <span
            className={`${styles.voteCount} ${(isSelectedAgainst || hasAgainstPosition) ? styles.voteCountAgainst : styles.voteCountDefault}`}
          >
            {counter_term_position_count}
          </span>
        </div>
      </div>
    </div>
  );
};

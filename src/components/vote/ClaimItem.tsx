import React from "react";
import { VoteItem, VoteDirection } from "../../types/vote";
import { Network } from "../../hooks/useAtomData";
import { ipfsToHttpUrl } from "../../utils/pinata";
import { getAtomVerificationStatus } from "../../config/verifiedAtoms";
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
}

export const ClaimItem: React.FC<ClaimItemProps> = ({
  voteItem,
  onChangeUnits,
  isVoteDirectionAllowed = () => true,
  walletAddress = "",
  network = Network.MAINNET,
}) => {
  const {
    id,
    subject,
    predicate,
    object,
    subject_image,
    object_image,
    subject_term_id,
    object_term_id,
    units = 0,
    direction = VoteDirection.None,
    term_position_count = 0,
    counter_term_position_count = 0,
    userHasPosition = false,
    userPositionDirection = VoteDirection.None,
  } = voteItem;

  const showSubjectImage = subject_image &&
    getAtomVerificationStatus(subject_term_id ?? undefined).status !== 'not-verified';
  const showObjectImage = object_image &&
    getAtomVerificationStatus(object_term_id ?? undefined).status !== 'not-verified';

  // Sélection en cours (non soumise)
  const isSelectedFor = direction === VoteDirection.For && units > 0;
  const isSelectedAgainst = direction === VoteDirection.Against && units > 0;
  const hasSelection = isSelectedFor || isSelectedAgainst;

  // Position existante sur la blockchain
  const hasForPosition = userHasPosition && userPositionDirection === VoteDirection.For;
  const hasAgainstPosition = userHasPosition && userPositionDirection === VoteDirection.Against;
  const hasAnyPosition = userHasPosition && userPositionDirection !== VoteDirection.None;

  const handleUpClick = () => {
    if (isSelectedFor) {
      onChangeUnits(id, VoteDirection.None, 0);
    } else if (!hasForPosition) {
      // New vote FOR, or switch from AGAINST to FOR
      onChangeUnits(id, VoteDirection.For, 1);
    }
  };

  const handleDownClick = () => {
    if (isSelectedAgainst) {
      onChangeUnits(id, VoteDirection.None, 0);
    } else if (!hasAgainstPosition) {
      // New vote AGAINST, or switch from FOR to AGAINST
      onChangeUnits(id, VoteDirection.Against, 1);
    }
  };

  // Up: locked when user already has FOR on-chain, or currently selecting against
  const upDisabled = hasForPosition || isSelectedAgainst;
  // Down: locked when user already has AGAINST on-chain, or currently selecting for
  const downDisabled = hasAgainstPosition || isSelectedFor;

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
          {showSubjectImage && (
            <img
              src={ipfsToHttpUrl(subject_image!)}
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
          {showObjectImage && (
            <img
              src={ipfsToHttpUrl(object_image!)}
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
          {hasAnyPosition && (
            <span
              className={`${styles.voteCount} ${(isSelectedFor || hasForPosition) ? styles.voteCountFor : styles.voteCountDefault}`}
            >
              {term_position_count}
            </span>
          )}
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
          {hasAnyPosition && (
            <span
              className={`${styles.voteCount} ${(isSelectedAgainst || hasAgainstPosition) ? styles.voteCountAgainst : styles.voteCountDefault}`}
            >
              {counter_term_position_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

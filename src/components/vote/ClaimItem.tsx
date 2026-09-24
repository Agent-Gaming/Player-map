import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
import { VoteItem, VoteDirection } from "../../types/vote";
import { Network } from "../../hooks/useAtomData";
import { getAtomVerificationStatus } from "../../config/verifiedAtoms";
import SafeImage from "../SafeImage";
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
    object_description,
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

  const objectPillRef = useRef<HTMLDivElement>(null);
  const [showObjectTooltip, setShowObjectTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [tooltipAbove, setTooltipAbove] = useState(false);

  const isSelectedFor = direction === VoteDirection.For && units > 0;
  const isSelectedAgainst = direction === VoteDirection.Against && units > 0;

  const hasForPosition = userHasPosition && userPositionDirection === VoteDirection.For;
  const hasAgainstPosition = userHasPosition && userPositionDirection === VoteDirection.Against;
  const hasAnyPosition = userHasPosition && userPositionDirection !== VoteDirection.None;

  const handleUpClick = () => {
    if (isSelectedFor) {
      onChangeUnits(id, VoteDirection.None, 0);
    } else if (!hasForPosition) {
      onChangeUnits(id, VoteDirection.For, 1);
    }
  };

  const handleDownClick = () => {
    if (isSelectedAgainst) {
      onChangeUnits(id, VoteDirection.None, 0);
    } else if (!hasAgainstPosition) {
      onChangeUnits(id, VoteDirection.Against, 1);
    }
  };

  const upDisabled = hasForPosition;
  const downDisabled = hasAgainstPosition;

  const handleObjectMouseEnter = () => {
    if (!object_description || !objectPillRef.current) return;
    const rect = objectPillRef.current.getBoundingClientRect();
    const scrollContainer = objectPillRef.current.closest('[data-scroll-list]');
    const containerTop = scrollContainer
      ? scrollContainer.getBoundingClientRect().top
      : 0;
    const spaceAbove = rect.top - containerTop;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceAbove > 110 && spaceBelow < 110;
    setTooltipAbove(above);
    setTooltipStyle({
      position: 'fixed',
      left: rect.left + rect.width / 2,
      ...(above
        ? { top: rect.top - 6, transform: 'translateX(-50%) translateY(-100%)' }
        : { top: rect.bottom + 6, transform: 'translateX(-50%)' }
      ),
    });
    setShowObjectTooltip(true);
  };

  const handleObjectMouseLeave = () => {
    setShowObjectTooltip(false);
  };

  return (
    <div
      className={`${styles.row} ${isSelectedFor ? styles.rowFor : isSelectedAgainst ? styles.rowAgainst : ''}`}
    >
      {/* Triple details */}
      <div className={styles.tripleWrapper}>
        <div className={styles.pill}>
          {showSubjectImage && (
            <SafeImage
              src={subject_image}
              alt=""
              className={styles.pillImage}
              placeholderElement={<span />}
            />
          )}
          <span className={styles.pillLabel}>{subject}</span>
        </div>
        <span
          title={predicate}
          className={styles.predicate}
        >
          {predicate}
        </span>
        <div
          ref={objectPillRef}
          className={styles.pill}
          onMouseEnter={handleObjectMouseEnter}
          onMouseLeave={handleObjectMouseLeave}
        >
          {showObjectImage && (
            <SafeImage
              src={object_image}
              alt=""
              className={styles.pillImage}
              placeholderElement={<span />}
            />
          )}
          <span className={styles.pillLabel}>{object}</span>
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

      {/* Portal tooltip */}
      {showObjectTooltip && object_description && ReactDOM.createPortal(
        <div
          className={`${styles.pillTooltip} ${tooltipAbove ? styles.pillTooltipAbove : styles.pillTooltipBelow}`}
          style={tooltipStyle}
        >
          {object_description}
        </div>,
        document.body
      )}
    </div>
  );
};

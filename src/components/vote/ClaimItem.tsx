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
import controllerIcon from '../img/controller.png';
import upIcon from './icons/up.png';
import downIcon from './icons/down.png';
import { SCORE_TYPE_LABEL, SCORE_TYPE_ICON, FeedbackScoreType } from '../../config/scoreType';
import { UNIT_VALUE } from '../../utils/constants';

// Same strong/weak amount convention as the archetype quiz
// (useArchetypeSubmission.ts's AMOUNT_FAIBLE/AMOUNT_FORT, 0.01/0.03 TRUST) —
// UNIT_VALUE here is 0.01 TRUST per unit (src/utils/constants.ts), so 1 unit
// = "faible" and 3 units = "fort" line up with those exact amounts. Visual
// intensity is conveyed by thumb size (small/large), same up/down icons as
// before — unlike the quiz's IntensitySelector, which uses icon count.
const UNITS_WEAK = 1;
const UNITS_STRONG = 3;
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
    userShares,
    score_type,
  } = voteItem;

  const isValidScoreType = (v?: string): v is FeedbackScoreType => !!v && v in SCORE_TYPE_LABEL;

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

  // curve_id 1 (the only one this app ever deposits into) is a fixed 1:1
  // price curve — confirmed live against the subgraph (a vault's
  // total_shares == total_assets, current_share_price == 1e18) — so shares
  // already directly approximate the deposited amount in wei, no separate
  // vault/share-price lookup needed. Midpoint between weak (1 unit) and
  // strong (3 units) to classify which one an existing position came from.
  const heldPositionIsStrong = (userShares ?? 0n) >= 2n * UNIT_VALUE; // midpoint of 1 and 3 units

  // Disabled only for the exact button that matches the position already
  // held (clicking it would be a true no-op) — every other button, same
  // direction or opposite, stays clickable: useSubmitVotes now handles a
  // same-direction intensity change as a top-up/partial-redeem instead of
  // requiring the whole direction to be locked out.
  const downStrongDisabled = hasAgainstPosition && heldPositionIsStrong;
  const downWeakDisabled = hasAgainstPosition && !heldPositionIsStrong;
  const upWeakDisabled = hasForPosition && !heldPositionIsStrong;
  const upStrongDisabled = hasForPosition && heldPositionIsStrong;

  const isSelected = (d: VoteDirection, u: number) => direction === d && units === u;

  const handleVoteClick = (d: VoteDirection, u: number) => {
    const isSame = isSelected(d, u);
    onChangeUnits(id, isSame ? VoteDirection.None : d, isSame ? 0 : u);
  };

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
        {/*
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
        */}
        <div className={styles.itemsTriplesContainer}>
          <img
            src={isValidScoreType(score_type) ? SCORE_TYPE_ICON[score_type] : controllerIcon}
            className={styles.controllerIcon}
            title={isValidScoreType(score_type) ? SCORE_TYPE_LABEL[score_type] : undefined}
          />
        </div>
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

          {hasAnyPosition && (
            <span
              className={`${styles.voteCount} ${(isSelectedFor || hasForPosition) ? styles.voteCountFor : styles.voteCountDefault}`}
            >
               <img src={upSvg} className={styles.upIcon} />
              {term_position_count}
            </span>
          )}
          
          {hasAnyPosition && (
            
            <span
              className={`${styles.voteCount} ${(isSelectedAgainst || hasAgainstPosition) ? styles.voteCountAgainst : styles.voteCountDefault}`}
            >
              <img src={downSvg} className={styles.downIcon} />
              {counter_term_position_count}
            </span>
          )}
      </div>

      {/* Vote buttons — strong/weak for/against, same units convention as the
          archetype quiz (IntensitySelector) but this row's own round-button
          look: one thumb per button, size (not icon count) conveys intensity. */}
      <div className={styles.voteGroup}>
        <button
          type="button"
          onClick={downStrongDisabled ? undefined : () => handleVoteClick(VoteDirection.Against, UNITS_STRONG)}
          disabled={downStrongDisabled}
          className={styles.voteBtn}
          aria-label="Strongly disagree"
        >
          <img
            src={isSelected(VoteDirection.Against, UNITS_STRONG) || (hasAgainstPosition && heldPositionIsStrong) ? downSvg : downNotSelectedSvg}
            className={`${styles.voteIcon} ${styles.voteIconStrong}`}
          />
        </button>
        <button
          type="button"
          onClick={downWeakDisabled ? undefined : () => handleVoteClick(VoteDirection.Against, UNITS_WEAK)}
          disabled={downWeakDisabled}
          className={styles.voteBtn}
          aria-label="Disagree"
        >
          <img
            src={isSelected(VoteDirection.Against, UNITS_WEAK) || (hasAgainstPosition && !heldPositionIsStrong) ? downSvg : downNotSelectedSvg}
            className={`${styles.voteIcon} ${styles.voteIconWeak}`}
          />
        </button>
        <button
          type="button"
          onClick={upWeakDisabled ? undefined : () => handleVoteClick(VoteDirection.For, UNITS_WEAK)}
          disabled={upWeakDisabled}
          className={styles.voteBtn}
          aria-label="Agree"
        >
          <img
            src={isSelected(VoteDirection.For, UNITS_WEAK) || (hasForPosition && !heldPositionIsStrong) ? upSvg : upNotSelectedSvg}
            className={`${styles.voteIcon} ${styles.voteIconWeak}`}
          />
        </button>
        <button
          type="button"
          onClick={upStrongDisabled ? undefined : () => handleVoteClick(VoteDirection.For, UNITS_STRONG)}
          disabled={upStrongDisabled}
          className={styles.voteBtn}
          aria-label="Strongly agree"
        >
          <img
            src={isSelected(VoteDirection.For, UNITS_STRONG) || (hasForPosition && heldPositionIsStrong) ? upSvg : upNotSelectedSvg}
            className={`${styles.voteIcon} ${styles.voteIconStrong}`}
          />
        </button>
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

import React from "react";
import styles from "./Positions.module.css";

interface RedeemSelectorProps {
  isSelected: boolean;
  onSelect: (positionId: string, selected: boolean) => void;
  positionId: string;
}

const RedeemSelector: React.FC<RedeemSelectorProps> = ({ 
  isSelected, 
  onSelect, 
  positionId 
}) => {
  return (
    <div className={styles.redeemSelectorWrapper}>
      <label className={styles.redeemSelectorLabel}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(positionId, e.target.checked)}
          className={styles.redeemCheckbox}
        />
      </label>
    </div>
  );
};

export default RedeemSelector;

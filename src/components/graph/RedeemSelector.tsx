import React from "react";

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
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      
      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(positionId, e.target.checked)}
          style={{
            width: "16px",
            height: "16px",
            accentColor: "#ffd32a",
          }}
        />
      </label>
    </div>
  );
};

export default RedeemSelector;

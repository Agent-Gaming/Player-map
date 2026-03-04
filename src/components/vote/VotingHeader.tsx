import React from "react";

interface VotingHeaderProps {
  onClose?: () => void;
}

export const VotingHeader: React.FC<VotingHeaderProps> = ({ onClose }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      <h2 style={{ fontSize: "1.5em", color: "#FFD32A", margin: "10px", fontWeight: "bold", textAlign: "center" }}>
        VOTE ON CLAIMS
      </h2>

      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.color = "#FFD32A";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.color = "#FFF";
          }}
          style={{
            position: "absolute",
            right: 0,
            backgroundColor: "transparent",
            border: "none",
            color: "#FFF",
            cursor: "pointer",
            fontSize: "2.5em",
            padding: "0px",
          }}
          aria-label="Close voting modal"
        >
          ×
        </button>
      )}
    </div>
  );
}; 
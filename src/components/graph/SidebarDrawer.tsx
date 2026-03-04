import React from "react";

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function SidebarDrawer({
  open,
  onClose,
  children,
}: SidebarDrawerProps) {
  return (
    <>
      {/* Overlay pour clic en dehors */}
      {open && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1200,
            backgroundColor: "transparent",
            cursor: "pointer",
          }}
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
      )}
      
      {/* Sidebar */}
      <div
        style={{
          position: "absolute",
          top: "18%",
          left: "5px",
          height: "68%",
          width: open ? "28.67vw" : 0,
          minWidth: open ? "490px" : 0,
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          borderRadius: 18,
          transition: "width 0.35s cubic-bezier(0.4, 1.3, 0.5, 1)",
          zIndex: 1300,
          boxShadow: "2px 0 16px rgba(0, 0, 0, 0.18)",
          border: open ? "1px solid rgba(255,255,255,0.1)" : "none",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
      {open && (
        <>
          <button
            style={{
              background: "none",
              border: "none",
              color: "#ffd32a",
              fontSize: 50,
              position: "absolute",
              padding: "10px 15px",
              top: 0,
              right: 5,
              cursor: "pointer",
              zIndex: 1302,
              transition: "color 0.2s, transform 0.1s",
              minWidth: "60px",
              minHeight: "60px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.color = "#ffe066";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.color = "#ffd32a";
            }}
            aria-label="Close sidebar"
          >
            ×
          </button>
          <div
            style={{
              display: "flex", 
              flexWrap: "wrap", 
              padding: "24px",
              overflowY: "auto",
              height: "100%",
            }}
          >
            {children}
          </div>
</>
      )}
      </div>
    </>
  );
}

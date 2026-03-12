import React from "react";
import styles from "./Positions.module.css";

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
          className={styles.overlay}
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
      )}
      
      {/* Sidebar */}
      <div
        className={styles.drawer}
        style={{
          width: open ? "28.67vw" : 0,
          minWidth: open ? "490px" : 0,
          border: open ? "1px solid rgba(255,255,255,0.1)" : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
      {open && (
        <>
          <button
            className={styles.drawerCloseBtn}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close sidebar"
          >
            ×
          </button>
          <div className={styles.drawerContent}>
            {children}
          </div>
</>
      )}
      </div>
    </>
  );
}

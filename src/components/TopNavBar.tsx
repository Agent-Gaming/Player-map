import React, { useState, useRef } from "react";
import { FaUser, FaArrowLeft, FaArrowRight, FaProjectDiagram } from "react-icons/fa";
import { SmartSearchInterface } from "playermap_graph";
import { ipfsToHttpUrl } from "../utils/pinata";
import SafeImage from "./SafeImage";
import searchIconUrl from "../assets/img/search.svg";
import agentLogoUrl from "../assets/img/agent.svg";
import infoIconUrl from "../assets/img/info.svg";
import styles from "./TopNavBar.module.css";

// ─── Disclaimer Text ───────────────────────────────────────────────────────────

const DISCLAIMER_TEXT = {
  p1: "Intuition is a decentralized protocol enabling users to create and attest to structured relationships between digital entities.",
  p2: "Unless expressly marked as \"Certified by Studio\", game titles, character names and related references are community-generated identifiers used for descriptive purposes only.",
  p3: "No affiliation, endorsement, or sponsorship by any game studio is implied."
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RightPanelMode = "speakup" | "atom" | "profile";

export interface GraphControls {
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  resetGraph: () => void;
  isSearching: boolean;
  handleSearch?: (query: string, filters: { subject: string; predicate: string; object: string }) => Promise<void>;
  handleSearchStart?: () => void;
}

interface TopNavBarProps {
  /** Controls exposed by GraphVisualization via onControlsReady */
  graphControls: GraphControls | null;
  /** Active endpoint passed to SmartSearchInterface */
  endpoint?: string;
  /** Current right panel mode */
  rightPanelMode: RightPanelMode;
  /** Change right panel mode */
  onPanelModeChange: (mode: RightPanelMode) => void;
  /** Logged-in user atom details (for avatar + name) */
  myAtomDetails?: any;
}

// ─── Composant ─────────────────────────────────────────────────────────────────

const TopNavBar: React.FC<TopNavBarProps> = ({
  graphControls,
  endpoint = "base",
  rightPanelMode,
  onPanelModeChange,
  myAtomDetails,
}) => {
  // Resolve avatar URL (supports IPFS and proxies external URLs in Discord mode)
  const rawImage = myAtomDetails?.image as string | undefined;
  const avatarUrl = rawImage ? ipfsToHttpUrl(rawImage) : undefined;
  const userName = myAtomDetails?.label as string | undefined;
  const [searchOpen, setSearchOpen] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  return (
    <nav className={styles.nav}>
      {/* ── Agent logo ─────────────────────────────── */}
      <img src={agentLogoUrl} alt="Agent" className={styles.agentLogo} />

      {/* ── Reset graph ─────────────────────────────── */}
      <button
        className={styles.iconBtn}
        onClick={() => graphControls?.resetGraph()}
        disabled={!graphControls}
        aria-label="Reset graph view"
        title="Reset view"
      >
        <FaProjectDiagram size={35} />
      </button>

      {/* ── Back ────────────────────────────────────── */}
      <button
        className={styles.iconBtn}
        onClick={() => graphControls?.goBack()}
        disabled={!graphControls?.canGoBack}
        aria-label="Go back"
        title="Back"
      >
        <FaArrowLeft size={35} />
      </button>

      {/* ── Forward ─────────────────────────────────── */}
      <button
        className={styles.iconBtn}
        onClick={() => graphControls?.goForward()}
        disabled={!graphControls?.canGoForward}
        aria-label="Go forward"
        title="Forward"
      >
        <FaArrowRight size={35} />
      </button>

      {/* ── Search (expands right) ───────────────────── */}
      <div ref={searchWrapRef} className={styles.searchWrapper}>
        {/* Search icon button */}
        <button
          className={`${styles.iconBtn} ${styles.searchBtn}`}
          onClick={() => setSearchOpen((v) => !v)}
          disabled={!graphControls}
          aria-label="Search"
          title="Search"
        >
          <img src={searchIconUrl} alt="search" width={35} height={35} />
        </button>

        {/* SmartSearchInterface expanding to the right */}
        <div className={`${styles.searchPanel} ${searchOpen ? styles.searchPanelOpen : styles.searchPanelClosed}`}>
          {graphControls?.handleSearch && (
            <SmartSearchInterface
              endpoint={endpoint}
              onSearch={graphControls.handleSearch}
              isSearching={graphControls.isSearching}
              onSearchStart={graphControls.handleSearchStart ?? (() => {})}
            />
          )}
        </div>
      </div>

      {/* ── Spacer ──────────────────────────────────── */}
      <div className={styles.spacer} />

      {/* ── Info button ─────────────────────────────── */}
      <div className={styles.infoWrapper}>
        <button
          className={styles.iconBtn}
          onMouseEnter={() => setShowInfoTooltip(true)}
          onMouseLeave={() => setShowInfoTooltip(false)}
          aria-label="Information"
          title="Information"
        >
          <img src={infoIconUrl} alt="Info" className={styles.infoIcon} />
        </button>
        {showInfoTooltip && (
          <div className={styles.infoTooltip}>
            <p className={styles.infoTooltipParagraph}>{DISCLAIMER_TEXT.p1}</p>
            <p className={styles.infoTooltipParagraph}>{DISCLAIMER_TEXT.p2}</p>
            <p style={{ margin: 0 }}>{DISCLAIMER_TEXT.p3}</p>
          </div>
        )}
      </div>

      {/* ── Separator ───────────────────────────────── */}
      <div className={styles.separator} />

      {/* ── Profile button (right) ───────────────────── */}
      <button
        className={styles.profileBtn}
        onClick={() =>
          onPanelModeChange(rightPanelMode === "profile" ? "speakup" : "profile")
        }
        aria-label="My profile"
        title="My profile"
      >
        {userName && <span className={styles.profileName}>{userName}</span>}
        <div className={styles.avatarContainer}>
          {avatarUrl ? (
            <SafeImage
              src={avatarUrl}
              fallbackSrc=""
              alt={userName ?? "Profile"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <FaUser size={45} color="#ffd32a" />
          )}
        </div>
      </button>
    </nav>
  );
};

export default TopNavBar;

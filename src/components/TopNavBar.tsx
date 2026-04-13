import React, { useState, useRef, useEffect } from "react";
import { FaUser, FaArrowLeft, FaArrowRight, FaProjectDiagram } from "react-icons/fa";
import { SmartSearchInterface } from "playermap_graph";
import { useGameContext } from "../contexts/GameContext";
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
  // Game context
  const { games, activeGame, setActiveGameId } = useGameContext();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectorOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [selectorOpen]);

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

      {/* ── Game selector ───────────────────────────── */}
      {games.length >= 2 && (
        <div ref={selectorRef} className={styles.gameSelectorWrapper}>
          <button
            className={styles.gameSelectorBtn}
            onClick={() => setSelectorOpen(v => !v)}
            aria-haspopup="listbox"
            aria-expanded={selectorOpen}
          >
            {activeGame?.imageUrl && (
              <img
                src={ipfsToHttpUrl(activeGame.imageUrl)}
                alt=""
                className={styles.gameSelectorIcon}
              />
            )}
            <span className={styles.gameSelectorLabel}>
              {activeGame?.label?.toUpperCase() ?? ''}
            </span>
            <span className={`${styles.gameSelectorChevron} ${selectorOpen ? styles.gameSelectorChevronOpen : ''}`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          {selectorOpen && (
            <div className={styles.gameSelectorDropdown} role="listbox">
              {games.map(g => (
                <button
                  key={g.atomId}
                  role="option"
                  aria-selected={g.atomId === activeGame?.atomId}
                  className={`${styles.gameSelectorOption} ${g.atomId === activeGame?.atomId ? styles.gameSelectorOptionActive : ''}`}
                  onClick={() => { setActiveGameId(g.atomId); setSelectorOpen(false); }}
                >
                  {g.imageUrl && (
                    <img src={ipfsToHttpUrl(g.imageUrl)} alt="" className={styles.gameSelectorIcon} />
                  )}
                  <span>{g.label?.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

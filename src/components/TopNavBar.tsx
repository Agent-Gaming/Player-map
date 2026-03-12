import React, { useState, useRef } from "react";
import { FaUser, FaArrowLeft, FaArrowRight, FaProjectDiagram } from "react-icons/fa";
import { SmartSearchInterface } from "playermap_graph";
import { isIpfsUrl, ipfsToHttpUrl } from "../utils/pinata";
import SafeImage from "./SafeImage";
import searchIconUrl from "../assets/img/search.svg";
import agentLogoUrl from "../assets/img/agent.svg";
import infoIconUrl from "../assets/img/info.svg";

// ─── Disclaimer Text ───────────────────────────────────────────────────────────

const DISCLAIMER_TEXT = {
  p1: "Intuition is a decentralized protocol enabling users to create and attest to structured relationships between digital entities.",
  p2: "Unless expressly marked as \"Certified by Studio\", game titles, character names and related references are community-generated identifiers used for descriptive purposes only.",
  p3: "No affiliation, endorsement, or sponsorship by any game studio is implied."
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const BTN_BASE: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.92)",
  color: "#ffd32a",
  border: "none",
  borderRadius: 10,
  width: 50,
  height: 50,
  fontSize: 18,
  fontWeight: "bold",
  boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  transition: "background 0.15s, transform 0.1s",
  flexShrink: 0,
  outline: "none",
};

const BTN_HOVER: React.CSSProperties = {
  transform: "translateY(-1px) scale(1.04)",
};

const BTN_DISABLED: React.CSSProperties = {
  opacity: 0.35,
  cursor: "not-allowed",
  transform: "none",
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
  // Resolve avatar URL (supports IPFS)
  const rawImage = myAtomDetails?.image as string | undefined;
  const avatarUrl = rawImage
    ? isIpfsUrl(rawImage)
      ? ipfsToHttpUrl(rawImage)
      : rawImage
    : undefined;
  const userName = myAtomDetails?.label as string | undefined;
  const [hovered, setHovered] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const getBtnStyle = (key: string, disabled = false): React.CSSProperties => {
    if (disabled) return { ...BTN_BASE, ...BTN_DISABLED };
    return hovered === key ? { ...BTN_BASE, ...BTN_HOVER } : BTN_BASE;
  };

  const getToggleBtnStyle = (mode: RightPanelMode, key: string): React.CSSProperties => {
    const isActive = rightPanelMode === mode;
    const base: React.CSSProperties = {
      ...BTN_BASE,
      background: "#18181b",
      color: isActive ? "#ffd32a" : "#18181b",
      border: isActive ? "2px solid #ffd32a" : "2px solid transparent",
      outline: "none",
    };
    if (hovered === key && !isActive) return { ...base, ...BTN_HOVER };
    return base;
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        width: "100%",
        height: "74px",
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 14px",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      {/* ── Agent logo ─────────────────────────────── */}
      <img src={agentLogoUrl} alt="Agent" style={{ height: 60, width: "auto", flexShrink: 0, paddingTop: "10px" }} />

      {/* ── Reset graph ─────────────────────────────── */}
      <button
        style={getBtnStyle("reset", !graphControls)}
        onClick={() => graphControls?.resetGraph()}
        disabled={!graphControls}
        aria-label="Reset graph view"
        title="Reset view"
        onMouseEnter={() => setHovered("reset")}
        onMouseLeave={() => setHovered("")}
      >
        <FaProjectDiagram size={35} />
      </button>

      {/* ── Back ────────────────────────────────────── */}
      <button
        style={getBtnStyle("back", !graphControls?.canGoBack)}
        onClick={() => graphControls?.goBack()}
        disabled={!graphControls?.canGoBack}
        aria-label="Go back"
        title="Back"
        onMouseEnter={() => setHovered("back")}
        onMouseLeave={() => setHovered("")}
      >
        <FaArrowLeft size={35} />
      </button>

      {/* ── Forward ─────────────────────────────────── */}
      <button
        style={getBtnStyle("forward", !graphControls?.canGoForward)}
        onClick={() => graphControls?.goForward()}
        disabled={!graphControls?.canGoForward}
        aria-label="Go forward"
        title="Forward"
        onMouseEnter={() => setHovered("forward")}
        onMouseLeave={() => setHovered("")}
      >
        <FaArrowRight size={35} />
      </button>

      {/* ── Search (expands right) ───────────────────── */}
      <div
        ref={searchWrapRef}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {/* Search icon button */}
        <button
          style={{
            ...getBtnStyle("search", !graphControls),
            background: "#000000",
            border: "none",
          }}
          onClick={() => setSearchOpen((v) => !v)}
          disabled={!graphControls}
          aria-label="Search"
          title="Search"
          onMouseEnter={() => setHovered("search")}
          onMouseLeave={() => setHovered("")}
        >
          <img
            src={searchIconUrl}
            alt="search"
            width={35}
            height={35}
          />
        </button>
        
        {/* SmartSearchInterface expanding to the right */}
        <div
          style={{
            position: "absolute",
            left: 52,
            top: "50%",
            transform: searchOpen
              ? "translateY(-50%) translateX(0)"
              : "translateY(-50%) translateX(-20px)",
            width: 560,
            opacity: searchOpen ? 1 : 0,
            visibility: searchOpen ? "visible" : "hidden",
            pointerEvents: searchOpen ? "auto" : "none",
            transition: "opacity 0.22s ease, transform 0.22s cubic-bezier(.4,0,.2,1), visibility 0.22s ease",
          }}
        >
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
      <div style={{ flex: 1 }} />

      {/* ── Separator ───────────────────────────────── */}
      <div
        style={{ width: 1, height: 32, background: "rgba(255,255,255,0.12)" }}
      />

      {/* ── Info button ─────────────────────────────── */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <button
          style={getBtnStyle("info")}
          onMouseEnter={() => {
            setHovered("info");
            setShowInfoTooltip(true);
          }}
          onMouseLeave={() => {
            setHovered("");
            setShowInfoTooltip(false);
          }}
          aria-label="Information"
          title="Information"
        >
          <img src={infoIconUrl} alt="Info" style={{ width: 30, height: 30 }} />
        </button>
        {showInfoTooltip && (
          <div style={{
            position: "absolute",
            top: "calc(65% + 12px)",
            left: "50%",
            transform: "translateX(-90%)",
            backgroundColor: "rgba(20, 20, 20, 0.9)",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            width: "320px",
            zIndex: 1000,
            lineHeight: "1.5",
            textAlign: "left",
          }}>
            <p style={{ margin: 0, marginBottom: "8px" }}>
              {DISCLAIMER_TEXT.p1}
            </p>
            <p style={{ margin: 0, marginBottom: "8px" }}>
              {DISCLAIMER_TEXT.p2}
            </p>
            <p style={{ margin: 0 }}>
              {DISCLAIMER_TEXT.p3}
            </p>
          </div>
        )}
      </div>

      {/* ── Profile button (right) ───────────────────── */}
      <button
        style={{
          background: "transparent",
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "4px 8px 4px 10px",
          flexShrink: 0,
          transition: "background 0.15s",
          outline: "none",
        }}
        onClick={() =>
          onPanelModeChange(rightPanelMode === "profile" ? "speakup" : "profile")
        }
        aria-label="My profile"
        title="My profile"
        onMouseEnter={() => setHovered("profile")}
        onMouseLeave={() => setHovered("")}
      >
        {userName && (
          <span
            style={{
              color: "#ffd32a",
              fontSize: 18,
              fontWeight: 700,
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "0.01em",
            }}
          >
            {userName}
          </span>
        )}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "2.5px solid #ffd32a",
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,211,42,0.08)",
          }}
        >
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

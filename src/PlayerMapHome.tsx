import React from "react";
import AgentLogo from "./assets/img/agent.svg";
import IntuitionSmallLogo from "./assets/img/Intuition-logo.svg";
import LogoAgentBg from "./assets/img/logo-agent.svg";
import Atom from "./assets/img/atom.svg";
import styles from "./PlayerMapHome.module.css";

interface PlayerMapHomeProps {
  walletConnected?: any;
  walletAddress?: string;
  wagmiConfig?: any;
  walletHooks?: any;
  onClose?: () => void;
  isOpen?: boolean;
  onCreatePlayer?: () => void;
}

const PlayerMapHome: React.FC<PlayerMapHomeProps> = ({
  walletConnected,
  walletAddress,
  wagmiConfig,
  walletHooks,
  onClose,
  isOpen: externalIsOpen,
  onCreatePlayer,
}) => {
  // Vérifier si l'utilisateur a un wallet connecté pour l'affichage conditionnel
  const isUserConnected =
    walletConnected &&
    (walletAddress ||
      (walletConnected.account && walletConnected.account.address));

  // Fonction pour gérer le clic sur le bouton de création de joueur
  const handleCreatePlayer = () => {
    if (onCreatePlayer) {
      onCreatePlayer();
    }
  };

  return (
    <div className={styles.container}>
      <img src={LogoAgentBg} alt="" aria-hidden="true" className={styles.backgroundLogo} />
      <div className={styles.topBar} />
      <div className={styles.logoRow}>
        <img
          src={AgentLogo}
          alt="Agent Logo"
          className={styles.logo}
        />
        <span className={styles.logoText}>- PLAYER MAP</span>
      </div>
      <h2 className={styles.title}>
        GAMING COMMUNITY GRAPH
      </h2>

      <div className={styles.textBlock}>
        <p>
          At first, there was nothing. And then, suddenly, the whole community
          appeared !
        </p>
        <p>
          Everything of which the gaming community would one day be
          composed, would be born in an instant.
        </p>
        <p>
          A single species of condensed matter, exploding in a vast universe.
        </p>
        <p>
          Although energy would neither be created nor destroyed, the
          interaction between these newly-created atoms would continue to create
          something beautiful...
        </p>
        <p>
          What had been separate would become whole again. And what would be
          created in the process would be even more beautiful than what came
          before...
        </p>
        <p>Our story begins with the atom. The cornerstone of our ecosystem.</p>
        <p>And our "atoms" start with you !</p>
      </div>

      <div className={styles.claimsBox}>
        <p>
          <span className={styles.highlight}>Claims</span> in Intuition, also
          referred to as <span className={styles.highlight}>"Triples"</span>{" "}
          structured in Semantic Triple format :
        </p>
        <p>
          [<span className={styles.highlight}>Subject</span>] ⇒ [
          <span className={styles.highlight}>Predicate</span>] ⇒ [
          <span className={styles.highlight}>Object</span>] (For example, a
          triple could be : [SciFi] [is] [strong Boss])
        </p>
        <p>This keeps our attestations tidy !</p>
      </div>

      <div className={styles.walletSection}>
        <p>
          You need to connect your{" "}
          <span className={styles.highlight}>wallet (Intuition network)</span>{" "}
          and pay{" "}
          <span className={styles.highlight}>1 $TRUST (less than $0.20)</span>{" "}
          to create your player !
        </p>

        <button
          className={styles.createBtn}
          onClick={handleCreatePlayer}
        >
          <img
            src={Atom}
            alt="Atom"
            className={styles.createBtnIcon}
          />
          CREATE YOUR PLAYER
        </button>
        <div className={styles.networkBadge}>
          ON{" "}
          <img
            src={IntuitionSmallLogo}
            alt="Intuition"
            className={styles.networkLogo}
          />{" "}
          MAINNET
        </div>
      </div>

      <div className={styles.bottomBar} />
    </div>
  );
};

export default PlayerMapHome;

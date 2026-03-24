import React, { useState, useEffect, useRef, useMemo } from "react";
import AgentLogo from "./assets/img/agent.svg";
import IntuitionSmallLogo from "./assets/img/Intuition-logo.svg";
import LogoAgentBg from "./assets/img/logo-agent.svg";
import Atom from "./assets/img/atom.svg";
import styles from "./PlayerMapHome.module.css";
import { DefaultPlayerMapConstants } from "./types/PlayerMapConfig";
import { usePlayerAliases } from "./hooks/usePlayerAliases";
import { useRegisterPlayer } from "./hooks/useRegisterPlayer";
import { useBatchCreateTriple } from "./hooks/useBatchCreateTriple";
import { useNetworkCheck } from "./shared/hooks/useNetworkCheck";
import { NetworkSwitchMessage } from "./shared/components/NetworkSwitchMessage";
import PlayerCreationProgress from "./PlayerCreationProgress";
import { RegistrationPhase, ClaimOption } from "./types/alias";

interface PlayerMapHomeProps {
  walletConnected?: any;
  walletAddress?: string;
  wagmiConfig?: any;
  walletHooks?: any;
  onClose?: () => void;
  isOpen?: boolean;
  onCreatePlayer?: () => void;
  constants?: DefaultPlayerMapConstants;
}

const PlayerMapHome: React.FC<PlayerMapHomeProps> = ({
  walletConnected,
  walletAddress,
  wagmiConfig,
  walletHooks,
  onClose,
  isOpen: externalIsOpen,
  onCreatePlayer,
  constants,
}) => {
  const publicClient = wagmiConfig?.publicClient;

  // ─── View state ─────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [registrationPhase, setRegistrationPhase] = useState<RegistrationPhase>('input');
  const [pseudo, setPseudo] = useState('');
  const [pseudoAtomId, setPseudoAtomId] = useState<string | undefined>(undefined);

  // ─── Form fields ─────────────────────────────────────────────────────────────
  const [pseudoInput, setPseudoInput] = useState('');
  const [useExistingAlias, setUseExistingAlias] = useState(false);
  const [selectedExistingAlias, setSelectedExistingAlias] = useState('');
  const [selectedGuild, setSelectedGuild] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ─── Phase 2 state ──────────────────────────────────────────────────────────
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [createdClaimIds, setCreatedClaimIds] = useState<string[]>([]);
  const [isCreatingClaims, setIsCreatingClaims] = useState(false);
  const [currentClaimIndex, setCurrentClaimIndex] = useState(0);
  const [claimError, setClaimError] = useState<string | undefined>(undefined);

  // ─── Hooks ──────────────────────────────────────────────────────────────────
  const { aliases, playerAtomId, isLoading: aliasesLoading } = usePlayerAliases(
    constants ? { walletAddress, constants } : ({} as any)
  );

  const {
    register,
    reset: resetIdentity,
    step: identityStep,
    isRegistering,
    error: identityError,
    pseudoAtomId: reg_pseudoAtomId,
  } = useRegisterPlayer(
    constants
      ? { walletConnected, walletAddress, constants, publicClient }
      : ({} as any)
  );

  const { batchCreateTriple } = useBatchCreateTriple({
    walletConnected,
    walletAddress,
    publicClient,
    constants: constants ?? ({} as any),
  });

  const { isCorrectNetwork, currentChainId, targetChainId } = useNetworkCheck({
    walletConnected,
    publicClient: wagmiConfig?.publicClient,
  });

  // ─── Available claims (excludes null objectId and entries without label) ─────
  const availableClaims: ClaimOption[] = useMemo(() => {
    if (!constants) return [];
    return Object.entries(constants.PLAYER_TRIPLE_TYPES)
      .filter(([, v]) => v.objectId !== null && v.label)
      .map(([id, v]) => ({
        id,
        label: v.label as string,
        predicateAtomId: v.predicateId as string,
        objectAtomId: v.objectId as string,
      }));
  }, [constants]);

  const guilds = constants?.OFFICIAL_GUILDS ?? [];
  const hasExistingAliases = !aliasesLoading && aliases && aliases.length > 0;

  // ─── Auto-transition: returning user already has account atom ────────────────
  useEffect(() => {
    if (!aliasesLoading && playerAtomId && showForm && registrationPhase === 'input') {
      setRegistrationPhase('identity-created');
      const primary = aliases.find(a => a.isPrimary);
      if (primary) {
        setPseudo(primary.pseudo);
        setPseudoAtomId(primary.atomId);
      }
    }
  }, [playerAtomId, aliasesLoading, showForm]);

  // ─── Transition after Phase 1 success ────────────────────────────────────────
  useEffect(() => {
    if (identityStep === 'success' && registrationPhase === 'creating-identity') {
      if (reg_pseudoAtomId) setPseudoAtomId(reg_pseudoAtomId);
      setRegistrationPhase('identity-created');
    }
  }, [identityStep, registrationPhase, reg_pseudoAtomId]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleOpenForm = () => {
    setShowForm(true);
    if (onCreatePlayer) onCreatePlayer();
  };

  const handleBack = () => {
    setShowForm(false);
    setRegistrationPhase('input');
    resetIdentity();
    setPseudoInput('');
    setPseudo('');
    setPseudoAtomId(undefined);
    setSelectedGuild('');
    setImageFile(null);
    setImagePreview(null);
    setUseExistingAlias(false);
    setSelectedExistingAlias('');
    setSelectedClaimIds([]);
    setCreatedClaimIds([]);
    setClaimError(undefined);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleValidate = () => {
    const username = useExistingAlias ? selectedExistingAlias : pseudoInput.trim();
    if (!username || !constants) return;
    setPseudo(username);
    setRegistrationPhase('creating-identity');
    register(username);
  };

  const handleRetryIdentity = () => { register(pseudo); };

  const handleResetIdentity = () => {
    resetIdentity();
    setRegistrationPhase('input');
    setPseudo('');
    setPseudoAtomId(undefined);
  };

  const handleToggleClaim = (id: string) => {
    setSelectedClaimIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateSelectedClaims = async () => {
    if (!pseudoAtomId) return;
    const pending = availableClaims.filter(
      c => selectedClaimIds.includes(c.id) && !createdClaimIds.includes(c.id)
    );

    // Also create guild triple if selected
    const guildPredicateEntry = constants?.PLAYER_TRIPLE_TYPES?.PLAYER_GUILD;
    const guildPending = selectedGuild && guildPredicateEntry?.predicateId && !createdClaimIds.includes('PLAYER_GUILD');

    if (pending.length === 0 && !guildPending) {
      setRegistrationPhase('complete');
      return;
    }

    setIsCreatingClaims(true);
    setClaimError(undefined);
    setRegistrationPhase('creating-claims');

    let idx = 0;

    // Guild triple first
    if (guildPending) {
      setCurrentClaimIndex(idx++);
      try {
        await batchCreateTriple([{
          subjectId: BigInt(pseudoAtomId),
          predicateId: BigInt(guildPredicateEntry.predicateId),
          objectId: BigInt(selectedGuild),
        }]);
        setCreatedClaimIds(prev => [...prev, 'PLAYER_GUILD']);
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : String(err));
        setIsCreatingClaims(false);
        setRegistrationPhase('identity-created');
        return;
      }
    }

    // Claims triples
    for (let i = 0; i < pending.length; i++) {
      setCurrentClaimIndex(idx++);
      const claim = pending[i];
      try {
        await batchCreateTriple([{
          subjectId: BigInt(pseudoAtomId),
          predicateId: BigInt(claim.predicateAtomId),
          objectId: BigInt(claim.objectAtomId),
        }]);
        setCreatedClaimIds(prev => [...prev, claim.id]);
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : String(err));
        setIsCreatingClaims(false);
        setRegistrationPhase('identity-created');
        return;
      }
    }

    setIsCreatingClaims(false);
    setRegistrationPhase('complete');
  };

  const handleSkipClaims = () => { setRegistrationPhase('complete'); };

  const isValidateDisabled = useExistingAlias ? !selectedExistingAlias : !pseudoInput.trim();

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <img src={LogoAgentBg} alt="" aria-hidden="true" className={styles.backgroundLogo} />
      <div className={styles.topBar} />
      <div className={styles.logoRow}>
        <img src={AgentLogo} alt="Agent Logo" className={styles.logo} />
        <span className={styles.logoText}>- PLAYER MAP</span>
      </div>

      <h2 className={styles.title}>GAMING COMMUNITY GRAPH</h2>


      {!showForm ? (
        /* ── Landing View ───────────────────────────────────────────────────── */
        <>

          <div className={styles.textBlock}>
            <p>At first, there was nothing. And then, suddenly, the whole community appeared !</p>
            <p>Everything of which the gaming community would one day be composed, would be born in an instant.</p>
            <p>A single species of condensed matter, exploding in a vast universe.</p>
            <p>Although energy would neither be created nor destroyed, the interaction between these newly-created atoms would continue to create something beautiful...</p>
            <p>What had been separate would become whole again. And what would be created in the process would be even more beautiful than what came before...</p>
            <p>Our story begins with the atom. The cornerstone of our ecosystem.</p>
            <p>And our "atoms" start with you !</p>
          </div>

          <div className={styles.claimsBox}>
            <p>
              <span className={styles.highlight}>Claims</span> in Intuition, also referred to as{" "}
              <span className={styles.highlight}>"Triples"</span>{" "}
              structured in Semantic Triple format :
            </p>
            <p>
              [<span className={styles.highlight}>Subject</span>] ⇒ [
              <span className={styles.highlight}>Predicate</span>] ⇒ [
              <span className={styles.highlight}>Object</span>] (For example, a triple could be : [SciFi] [is] [strong Boss])
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
            <button className={styles.createBtn} onClick={handleOpenForm}>
              <img src={Atom} alt="Atom" className={styles.createBtnIcon} />
              CREATE YOUR PLAYER
            </button>
            <div className={styles.networkBadge}>
              ON{" "}
              <img src={IntuitionSmallLogo} alt="Intuition" className={styles.networkLogo} />{" "}
              MAINNET
            </div>
          </div>
        </>
      ) : (
        /* ── Form View ──────────────────────────────────────────────────────── */
        <>
          <div className={styles.formWrapper}>
            <button className={styles.backLink} onClick={handleBack}>
              ← Back
            </button>
            <p className={styles.title2}>CREATE YOUR PLAYER</p>
            {!isCorrectNetwork ? (
              <NetworkSwitchMessage
                currentChainId={currentChainId}
                targetChainId={targetChainId}
              />
            ) : registrationPhase === 'input' ? (
              /* ── Input Form ─────────────────────────────────────────────────── */
              <div className={styles.formBlock}>

                {/* Username row — with alias select when user has existing aliases */}
                <div className={styles.formRow}>
                  <div className={styles.formRowLabel}>
                    <span className={styles.rowTitle}>Username</span>
                  </div>
                  <div className={styles.formRowControl}>
                    {hasExistingAliases ? (
                      <>
                        <div className={styles.radioGroup}>
                          <label className={styles.radioLabel}>
                            <input
                              type="radio"
                              name="aliasMode"
                              checked={useExistingAlias}
                              onChange={() => setUseExistingAlias(true)}
                            />
                            Use an existing username
                          </label>
                          <label className={styles.radioLabel}>
                            <input
                              type="radio"
                              name="aliasMode"
                              checked={!useExistingAlias}
                              onChange={() => setUseExistingAlias(false)}
                            />
                            Create a new username
                          </label>
                        </div>
                        {useExistingAlias ? (
                          <select
                            value={selectedExistingAlias}
                            onChange={e => setSelectedExistingAlias(e.target.value)}
                            className={styles.select}
                          >
                            <option value="">Your account already has a username for at least one game in the ecosystem. Which one would you like to use to confirm you are a player of this game?</option>
                            {aliases.map(a => (
                              <option key={a.atomId} value={a.pseudo}>
                                {a.pseudo}{a.isPrimary ? " ★" : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={pseudoInput}
                            onChange={e => setPseudoInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !isValidateDisabled) handleValidate(); }}
                            className={styles.input}
                            placeholder="DarkPlayer42"
                          />
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        value={pseudoInput}
                        onChange={e => setPseudoInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !isValidateDisabled) handleValidate(); }}
                        className={styles.input}
                        placeholder="DarkPlayer42"
                      />
                    )}
                  </div>
                </div>

                {/* Guild row */}
                {guilds.length > 0 && (
                  <div className={styles.formRow}>
                    <div className={styles.formRowLabel}>
                      <span>Are you a member of a guild in this game?</span>
                    </div>
                    <div className={styles.formRowControl}>
                      <select
                        value={selectedGuild}
                        onChange={e => setSelectedGuild(e.target.value)}
                        className={styles.select}
                      >
                        <option value="">— No guild —</option>
                        {guilds.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Profile picture row */}
                <div className={styles.formRow}>
                  <div className={styles.formRowLabel}>
                    <span className={styles.rowTitle}>Player profile picture</span>
                    <span className={styles.rowDesc}>This image will be used as the player's profile picture and can't be replaced or added later.</span>
                  </div>
                  <div className={styles.formRowControl}>
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className={styles.imagePreviewThumb} />
                    )}
                    <button
                      className={styles.uploadBtn}
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      UPLOAD
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>

                {/* Terms */}
                <div className={styles.termsBox}>
                  <p>Users are solely responsible for any information, data, or content they record on the blockchain through the Service.</p>
                  <p>Users agree not to create or publish profiles that :</p>
                  <ul>
                    <li>Impersonate another person</li>
                    <li>Contain defamatory information</li>
                    <li>Violate privacy rights</li>
                    <li>Infringe intellectual property rights</li>
                    <li>Violate applicable laws.</li>
                  </ul>
                  <p>The Company does not review, approve, or moderate all information recorded on the blockchain through the Service.</p>
                </div>

                {/* Validate */}
                <button
                  className={styles.validateBtn}
                  onClick={handleValidate}
                  disabled={isValidateDisabled}
                >
                  VALIDATE
                </button>
                <div className={styles.networkBadge}>
                  ON{" "}
                  <img src={IntuitionSmallLogo} alt="Intuition" className={styles.networkLogo} />{" "}
                  MAINNET
                </div>
              </div>
            ) : (
              /* ── Progress / Phase 2 / Complete ─────────────────────────────── */
              <div className={styles.formBlock}>
                {registrationPhase === 'complete' && (
                  <button className={styles.backLink} onClick={handleBack}>
                    ← Back to home
                  </button>
                )}
                <PlayerCreationProgress
                  walletAddress={walletAddress}
                  constants={constants!}
                  registrationPhase={registrationPhase}
                  pseudoInput={pseudoInput}
                  onPseudoInputChange={setPseudoInput}
                  onCreateIdentity={handleValidate}
                  identityStep={identityStep}
                  isCreatingIdentity={isRegistering}
                  identityError={identityError}
                  onRetryIdentity={handleRetryIdentity}
                  onResetIdentity={handleResetIdentity}
                  pseudo={pseudo}
                  aliases={aliases}
                  aliasesLoading={aliasesLoading}
                  availableClaims={availableClaims}
                  selectedClaimIds={selectedClaimIds}
                  createdClaimIds={createdClaimIds}
                  onToggleClaim={handleToggleClaim}
                  onCreateSelectedClaims={handleCreateSelectedClaims}
                  onSkipClaims={handleSkipClaims}
                  isCreatingClaims={isCreatingClaims}
                  currentClaimIndex={currentClaimIndex}
                  claimError={claimError}
                />

              </div>
            )}
          </div>
        </>
      )}

      <div className={styles.bottomBar} />
    </div>
  );
};

export default PlayerMapHome;

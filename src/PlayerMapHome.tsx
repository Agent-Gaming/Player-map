import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { RegistrationPhase, InitItem } from "./types/alias";

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
  const [accountAtomId, setAccountAtomId] = useState<string | undefined>(undefined);
  const [aliasTripleId, setAliasTripleId] = useState<string | undefined>(undefined);

  // ─── Form fields ─────────────────────────────────────────────────────────────
  const [pseudoInput, setPseudoInput] = useState('');
  const [useExistingAlias, setUseExistingAlias] = useState(false);
  const [selectedExistingAlias, setSelectedExistingAlias] = useState('');
  const [selectedGuild, setSelectedGuild] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ─── Phase 2 state ──────────────────────────────────────────────────────────
  const [existingItems, setExistingItems] = useState<InitItem[]>([]);
  const [toCreateItems, setToCreateItems] = useState<InitItem[]>([]);
  const [fairplayTripleId, setFairplayTripleId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentInitIndex, setCurrentInitIndex] = useState(0);
  const [initError, setInitError] = useState<string | undefined>(undefined);

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
    accountAtomId: reg_accountAtomId,
    aliasTripleId: reg_aliasTripleId,
  } = useRegisterPlayer(
    constants
      ? { walletConnected, walletAddress, constants, publicClient, guildId: selectedGuild,
          existingAccountAtomId: accountAtomId }
      : ({} as any)
  );

  const { batchCreateTriple, checkTripleExists, computeTripleId } = useBatchCreateTriple({
    walletConnected,
    walletAddress,
    publicClient,
    constants: constants ?? ({} as any),
  });

  const { isCorrectNetwork, currentChainId, targetChainId } = useNetworkCheck({
    walletConnected,
    publicClient: wagmiConfig?.publicClient,
  });

  const guilds = constants?.OFFICIAL_GUILDS ?? [];
  const hasExistingAliases = !aliasesLoading && aliases && aliases.length > 0;

  // ─── Auto-transition: returning user already has account atom ────────────────
  useEffect(() => {
    if (!aliasesLoading && playerAtomId && showForm && registrationPhase === 'input') {
      const primary = aliases.find(a => a.isPrimary);
      if (primary) {
        setPseudo(primary.pseudo);
        setPseudoAtomId(primary.atomId);
        setAliasTripleId(primary.tripleId);
        setAccountAtomId(playerAtomId);
      }
      setRegistrationPhase('loading-existing');
    }
  }, [playerAtomId, aliasesLoading, showForm]);
  // Note: registrationPhase intentionally NOT in deps (avoid re-trigger)

  // ─── Transition after Phase 1 success → loading-existing ─────────────────────
  useEffect(() => {
    if (identityStep === 'success' && registrationPhase === 'creating-identity') {
      if (reg_pseudoAtomId) setPseudoAtomId(reg_pseudoAtomId);
      if (reg_accountAtomId) setAccountAtomId(reg_accountAtomId);
      if (reg_aliasTripleId) setAliasTripleId(reg_aliasTripleId);
      setRegistrationPhase('loading-existing');
    }
  }, [identityStep, registrationPhase, reg_pseudoAtomId, reg_accountAtomId, reg_aliasTripleId]);

  // ─── Check existing items — defined before the useEffect that calls it ────────
  const checkExistingItems = useCallback(async () => {
    if (!accountAtomId || !aliasTripleId || !pseudoAtomId || !constants) return;

    const fairplayAtomId = constants.PLAYER_TRIPLE_TYPES.PLAYER_QUALITY_1.objectId as string;
    const gamesId = constants.COMMON_IDS.GAMES_ID;
    const isId = constants.COMMON_IDS.IS;
    const isPlayerOfId = constants.COMMON_IDS.IS_PLAYER_OF;
    const inId = constants.COMMON_IDS.IN;

    // Check Item B: [accountAtomId] → IS → [fairplayAtomId]
    const fairplayExists = await checkTripleExists(
      BigInt(accountAtomId), BigInt(isId), BigInt(fairplayAtomId)
    );
    let knownFairplayTripleId: string | null = null;
    if (fairplayExists) {
      const id = await computeTripleId(BigInt(accountAtomId), BigInt(isId), BigInt(fairplayAtomId));
      knownFairplayTripleId = `0x${id.toString(16)}`;
      setFairplayTripleId(knownFairplayTripleId);
    }

    // Check Item A: [aliasTripleId] → IS_PLAYER_OF → [gamesId]
    const gameExists = await checkTripleExists(
      BigInt(aliasTripleId), BigInt(isPlayerOfId), BigInt(gamesId)
    );

    // Check Item C: [fairplayTripleId] → IN → [gamesId]
    let contextExists = false;
    if (knownFairplayTripleId) {
      contextExists = await checkTripleExists(
        BigInt(knownFairplayTripleId), BigInt(inId), BigInt(gamesId)
      );
    }

    // Build existing items (Phase 1 always created these)
    const guildName = selectedGuild
      ? constants.OFFICIAL_GUILDS.find(g => g.id === selectedGuild)?.name ?? selectedGuild
      : null;

    const phase1Items: InitItem[] = [
      {
        id: 'pseudo-atom', type: 'atom',
        label: `Atom: "${pseudo}"`,
        description: 'Username atom',
        status: 'existing',
      },
      {
        id: 'account-atom', type: 'atom',
        label: `Account: ${accountAtomId.slice(0, 8)}...`,
        description: 'Wallet address atom',
        status: 'existing',
      },
      {
        id: 'alias-triple', type: 'triple',
        label: `Account has alias ${pseudo}`,
        description: `[Account] — [has alias] — [${pseudo}]`,
        status: 'existing',
      },
    ];
    if (guildName) {
      phase1Items.push({
        id: 'guild-nested', type: 'nested-triple',
        label: `(has alias) is member of ${guildName}`,
        description: `Nested: (alias triple) — [is member of] — [${guildName}]`,
        status: 'existing',
      });
    }

    const existing: InitItem[] = [...phase1Items];
    const toCreate: InitItem[] = [];

    // Item B
    if (fairplayExists && knownFairplayTripleId) {
      existing.push({
        id: 'fairplay', type: 'triple',
        label: 'Account is fairplay',
        description: '[Account] — [is] — [fairplay]',
        status: 'existing',
        resultTripleId: knownFairplayTripleId,
      });
    } else {
      toCreate.push({
        id: 'fairplay', type: 'triple',
        label: 'Account is fairplay',
        description: '[Account] — [is] — [fairplay]',
        status: 'to-create',
        subjectId: accountAtomId,
        predicateId: isId,
        objectId: fairplayAtomId,
      });
    }

    // Item A
    if (gameExists) {
      existing.push({
        id: 'game-nested', type: 'nested-triple',
        label: '(has alias) is player of Bossfighter',
        description: 'Nested: (alias triple) — [is player of] — [Bossfighter]',
        status: 'existing',
      });
    } else {
      toCreate.push({
        id: 'game-nested', type: 'nested-triple',
        label: '(has alias) is player of Bossfighter',
        description: 'Nested: (alias triple) — [is player of] — [Bossfighter]',
        status: 'to-create',
        subjectId: aliasTripleId,
        predicateId: isPlayerOfId,
        objectId: gamesId,
      });
    }

    // Item C (only checkable if fairplay triple exists; otherwise it cannot exist)
    if (contextExists && knownFairplayTripleId) {
      existing.push({
        id: 'context-nested', type: 'nested-triple',
        label: '(is fairplay) in Bossfighter',
        description: 'Nested: (fairplay triple) — [in] — [Bossfighter]',
        status: 'existing',
      });
    } else {
      toCreate.push({
        id: 'context-nested', type: 'nested-triple',
        label: '(is fairplay) in Bossfighter',
        description: 'Nested: (fairplay triple) — [in] — [Bossfighter]',
        status: 'to-create',
        // Note: no subjectId — depends on fairplayTripleId resolved at creation time
      });
    }

    setExistingItems(existing);
    setToCreateItems(toCreate);
    setRegistrationPhase('ready-to-initialize');
  }, [accountAtomId, aliasTripleId, pseudoAtomId, pseudo, selectedGuild, constants,
      checkTripleExists, computeTripleId]);

  // ─── Trigger existence checks when entering loading-existing ──────────────────
  useEffect(() => {
    if (
      registrationPhase === 'loading-existing' &&
      accountAtomId &&
      aliasTripleId &&
      pseudoAtomId &&
      constants
    ) {
      checkExistingItems().catch(err => {
        console.error('Phase 2 check error:', err);
        setRegistrationPhase('error');
      });
    }
  }, [registrationPhase, accountAtomId, aliasTripleId, pseudoAtomId, checkExistingItems]);

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
    setAccountAtomId(undefined);
    setAliasTripleId(undefined);
    setSelectedGuild('');
    setImageFile(null);
    setImagePreview(null);
    setUseExistingAlias(false);
    setSelectedExistingAlias('');
    setExistingItems([]);
    setToCreateItems([]);
    setFairplayTripleId(null);
    setIsInitializing(false);
    setCurrentInitIndex(0);
    setInitError(undefined);
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
    register(username, imageFile ?? undefined);
  };

  const handleRetryIdentity = () => { register(pseudo, imageFile ?? undefined); };

  const handleResetIdentity = () => {
    resetIdentity();
    setRegistrationPhase('input');
    setPseudo('');
    setPseudoAtomId(undefined);
    setAccountAtomId(undefined);
    setAliasTripleId(undefined);
  };

  const handleInitialize = useCallback(async () => {
    if (!accountAtomId || !aliasTripleId || !constants) return;

    const pending = toCreateItems.filter(i => i.status === 'to-create');
    if (pending.length === 0) {
      setRegistrationPhase('complete');
      return;
    }

    setIsInitializing(true);
    setInitError(undefined);
    setRegistrationPhase('creating-claims');

    const fairplayAtomId = constants.PLAYER_TRIPLE_TYPES.PLAYER_QUALITY_1.objectId as string;
    const gamesId = constants.COMMON_IDS.GAMES_ID;
    const isId = constants.COMMON_IDS.IS;
    const isPlayerOfId = constants.COMMON_IDS.IS_PLAYER_OF;
    const inId = constants.COMMON_IDS.IN;

    let currentFairplayTripleId = fairplayTripleId;
    let idx = 0;

    const tryCreate = async (id: string): Promise<boolean> => {
      const item = toCreateItems.find(i => i.id === id && i.status === 'to-create');
      if (!item) return true; // already exists or not to create

      setCurrentInitIndex(idx++);
      setToCreateItems(prev => prev.map(i => i.id === id ? { ...i, status: 'creating' } : i));

      try {
        if (id === 'fairplay') {
          await batchCreateTriple([{
            subjectId: BigInt(accountAtomId),
            predicateId: BigInt(isId),
            objectId: BigInt(fairplayAtomId),
          }]);
          const newId = await computeTripleId(BigInt(accountAtomId), BigInt(isId), BigInt(fairplayAtomId));
          currentFairplayTripleId = `0x${newId.toString(16)}`;
          setFairplayTripleId(currentFairplayTripleId);
          setToCreateItems(prev => prev.map(i =>
            i.id === id ? { ...i, status: 'created', resultTripleId: currentFairplayTripleId ?? undefined } : i
          ));
        } else if (id === 'game-nested') {
          await batchCreateTriple([{
            subjectId: BigInt(aliasTripleId),
            predicateId: BigInt(isPlayerOfId),
            objectId: BigInt(gamesId),
          }]);
          setToCreateItems(prev => prev.map(i => i.id === id ? { ...i, status: 'created' } : i));
        } else if (id === 'context-nested') {
          if (!currentFairplayTripleId) throw new Error('Fairplay triple ID not available for nested context');
          await batchCreateTriple([{
            subjectId: BigInt(currentFairplayTripleId),
            predicateId: BigInt(inId),
            objectId: BigInt(gamesId),
          }]);
          setToCreateItems(prev => prev.map(i => i.id === id ? { ...i, status: 'created' } : i));
        }
        return true;
      } catch (err) {
        setToCreateItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
        setInitError(err instanceof Error ? err.message : String(err));
        return false;
      }
    };

    // Ordered: B first (fairplay), then A (game-nested), then C (context-nested)
    const success1 = await tryCreate('fairplay');
    if (!success1) { setIsInitializing(false); setRegistrationPhase('ready-to-initialize'); return; }

    const success2 = await tryCreate('game-nested');
    if (!success2) { setIsInitializing(false); setRegistrationPhase('ready-to-initialize'); return; }

    const success3 = await tryCreate('context-nested');
    if (!success3) { setIsInitializing(false); setRegistrationPhase('ready-to-initialize'); return; }

    setIsInitializing(false);
    setRegistrationPhase('complete');
  }, [accountAtomId, aliasTripleId, fairplayTripleId, toCreateItems, constants,
      batchCreateTriple, computeTripleId]);

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
            {!isCorrectNetwork ? (
              <NetworkSwitchMessage
                currentChainId={currentChainId}
                targetChainId={targetChainId}
              />
            ) : registrationPhase === 'input' ? (
              /* ── Input Form ─────────────────────────────────────────────────── */
              <div className={styles.formBlock}>
                <button className={styles.backLink} onClick={handleBack}>
                  ← Back
                </button>

                <p className={styles.title2}>CREATE YOUR PLAYER</p>

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
                <button className={styles.backLink} onClick={handleBack}>
                  ← Back
                </button>
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
                  hasGuild={Boolean(selectedGuild)}
                  guildName={selectedGuild
                    ? constants?.OFFICIAL_GUILDS?.find(g => g.id === selectedGuild)?.name
                    : undefined}
                  existingItems={existingItems}
                  toCreateItems={toCreateItems}
                  onInitialize={handleInitialize}
                  isInitializing={isInitializing}
                  currentInitIndex={currentInitIndex}
                  initError={initError}
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

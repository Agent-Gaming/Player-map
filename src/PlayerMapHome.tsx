import React, { useState, useEffect, useRef, useCallback } from "react";
import AgentLogo from "./assets/img/agent.svg";
import IntuitionSmallLogo from "./assets/img/Intuition-logo.svg";
import LogoAgentBg from "./assets/img/logo-agent.svg";
import Atom from "./assets/img/atom.svg";
import styles from "./PlayerMapHome.module.css";
import { usePlayerAliases } from "./hooks/usePlayerAliases";
import { fetchAccountConsent } from './api/fetchPlayerAliases';
import { useRegisterPlayer } from "./hooks/useRegisterPlayer";
import { useBatchCreateTriple, TripleToCreate } from "./hooks/useBatchCreateTriple";
import { useNetworkCheck } from "./shared/hooks/useNetworkCheck";
import { NetworkSwitchMessage } from "./shared/components/NetworkSwitchMessage";
import PlayerCreationProgress from "./PlayerCreationProgress";
import { RegistrationPhase, InitItem } from "./types/alias";
import { useGameContext } from "./contexts/GameContext";
import { PREDICATES } from "./utils/constants";

interface PlayerMapHomeProps {
  walletConnected?: any;
  walletAddress?: string;
  wagmiConfig?: any;
  walletHooks?: any;
  onClose?: () => void;
  isOpen?: boolean;
  onCreatePlayer?: () => void;
  onRegistrationComplete?: () => void;
  hasConfirmedPlayer?: boolean;
}

const PlayerMapHome: React.FC<PlayerMapHomeProps> = ({
  walletConnected,
  walletAddress,
  wagmiConfig,
  walletHooks,
  onClose,
  isOpen: externalIsOpen,
  onCreatePlayer,
  onRegistrationComplete,
  hasConfirmedPlayer = false,
}) => {
  const publicClient = wagmiConfig?.publicClient;
  const { activeGame } = useGameContext();

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

  // ─── Consent state ───────────────────────────────────────────────────────────
  const [consentAlreadyAccepted, setConsentAlreadyAccepted] = useState(false);
  const [rgpdChecked, setRgpdChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  // ─── Phase 2 state ──────────────────────────────────────────────────────────
  const [existingItems, setExistingItems] = useState<InitItem[]>([]);
  const [toCreateItems, setToCreateItems] = useState<InitItem[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentInitIndex, setCurrentInitIndex] = useState(0);
  const [initError, setInitError] = useState<string | undefined>(undefined);

  // ─── Hooks ──────────────────────────────────────────────────────────────────
  const { aliases, playerAtomId, isLoading: aliasesLoading } = usePlayerAliases({ walletAddress });

  const {
    register,
    reset: resetIdentity,
    step: identityStep,
    isRegistering,
    error: identityError,
    pseudoAtomId: reg_pseudoAtomId,
    accountAtomId: reg_accountAtomId,
    aliasTripleId: reg_aliasTripleId,
  } = useRegisterPlayer({
    walletConnected,
    walletAddress,
    publicClient,
    guildId: selectedGuild,
    existingAccountAtomId: accountAtomId,
    existingPseudoAtomId: useExistingAlias
      ? aliases.find(a => a.atomId === selectedExistingAlias)?.atomId
      : undefined,
    existingAliasTripleId: useExistingAlias
      ? aliases.find(a => a.atomId === selectedExistingAlias)?.tripleId
      : undefined,
    consentAlreadyAccepted,
    chainId: publicClient?.chain?.id,
  });

  const { batchCreateTriple, checkTripleExists, computeTripleId } = useBatchCreateTriple({
    walletConnected,
    walletAddress,
    publicClient,
  });

  const { isCorrectNetwork, currentChainId, targetChainId, switchNetwork } = useNetworkCheck({
    walletConnected,
    publicClient: wagmiConfig?.publicClient,
  });

  const guilds = activeGame?.guilds ?? [];
  const hasExistingAliases = !aliasesLoading && aliases && aliases.length > 0;

  // ─── Auto-transition: returning user already has account atom ────────────────
  useEffect(() => {
    if (!aliasesLoading && playerAtomId && showForm && registrationPhase === 'input') {

      if (hasConfirmedPlayer) {
        // Already registered for this game → skip form, go to Phase 2 check
        const primary = aliases.find(a => a.isPrimary);
        if (primary) {
          let primaryPseudo = primary.pseudo;
          try { primaryPseudo = JSON.parse(primaryPseudo).name || primaryPseudo; } catch { /* use raw */ }
          setPseudo(primaryPseudo);
          setPseudoAtomId(primary.atomId);
          setAliasTripleId(primary.tripleId);
          setAccountAtomId(playerAtomId);
        }
        setRegistrationPhase('loading-existing');
      } else {
        // Has alias from another game → stay on form, pre-select existing alias
        setUseExistingAlias(true);
        setAccountAtomId(playerAtomId);
      }

      // Check if consent was already accepted on-chain (both cases)
      const acceptedId = PREDICATES.ACCEPTED;
      if (playerAtomId && !playerAtomId.startsWith('<')) {
        fetchAccountConsent(playerAtomId, acceptedId).then(result => {
          if (result.exists) setConsentAlreadyAccepted(true);
        }).catch(() => {/* silently ignore */});
      }
    }
  }, [playerAtomId, aliasesLoading, showForm, hasConfirmedPlayer]);
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

  // ─── Notify parent when registration is complete (triggers cache invalidation) ─
  useEffect(() => {
    if (registrationPhase === 'complete' && onRegistrationComplete) {
      onRegistrationComplete();
    }
  }, [registrationPhase, onRegistrationComplete]);

  // ─── Check existing items — defined before the useEffect that calls it ────────
  const checkExistingItems = useCallback(async () => {
    if (!accountAtomId || !aliasTripleId || !pseudoAtomId) return;
    const gamesId = activeGame?.atomId;
    if (!gamesId) return;
    const claims = activeGame?.claims ?? [];
    if (claims.length === 0) return;
    const isId = PREDICATES.IS;
    const isPlayerOfId = PREDICATES.IS_PLAYER_OF;
    const inId = PREDICATES.IN;
    const isMemberOfId = PREDICATES.IS_MEMBER_OF;

    // Check Item A: [aliasTripleId] → IS_PLAYER_OF → [gamesId]
    const gameExists = await checkTripleExists(
      BigInt(aliasTripleId), BigInt(isPlayerOfId), BigInt(gamesId)
    );

    const guildName = selectedGuild
      ? guilds.find(g => g.atomId === selectedGuild)?.label ?? selectedGuild
      : null;

    // Check guild membership on-chain — may not exist if reusing an existing alias
    let guildExists = false;
    if (selectedGuild) {
      guildExists = await checkTripleExists(
        BigInt(aliasTripleId), BigInt(isMemberOfId), BigInt(selectedGuild)
      );
    }

    const phase1Items: InitItem[] = [
      {
        id: 'pseudo-atom', type: 'atom',
        label: `Atom: "${pseudo}"`,
        description: 'Username atom',
        status: 'existing',
        image: aliases?.find(a => a.atomId === pseudoAtomId)?.image,
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
        image: aliases?.find(a => a.atomId === pseudoAtomId)?.image,
      },
    ];
    if (guildName) {
      phase1Items.push({
        id: 'guild-nested', type: 'nested-triple',
        label: `(has alias) is member of ${guildName}`,
        description: `Nested: (alias triple) — [is member of] — [${guildName}]`,
        status: guildExists ? 'existing' : 'to-create',
      });
    }

    const existing: InitItem[] = [...phase1Items].filter(i => i.status === 'existing');
    const toCreate: InitItem[] = [...phase1Items].filter(i => i.status === 'to-create');

    const gameLabel = activeGame?.label ?? 'this game';

    // Items B: one claim triple per entry in activeGame.claims
    // Also track the first claim's triple id for Item C (context-nested)
    let firstKnownClaimTripleId: string | null = null;
    const firstClaimLabel = claims[0].label;
    for (const claim of claims) {
      const claimExists = await checkTripleExists(
        BigInt(accountAtomId), BigInt(isId), BigInt(claim.atomId)
      );
      let knownClaimTripleId: string | null = null;
      if (claimExists) {
        const id = await computeTripleId(BigInt(accountAtomId), BigInt(isId), BigInt(claim.atomId));
        knownClaimTripleId = `0x${id.toString(16)}`;
        if (firstKnownClaimTripleId === null) {
          firstKnownClaimTripleId = knownClaimTripleId;
        }
      }
      if (claimExists && knownClaimTripleId) {
        existing.push({
          id: `claim-${claim.atomId}`, type: 'triple',
          label: `Account is ${claim.label}`,
          description: `[Account] — [is] — [${claim.label}]`,
          status: 'existing',
          resultTripleId: knownClaimTripleId,
        });
      } else {
        toCreate.push({
          id: `claim-${claim.atomId}`, type: 'triple',
          label: `Account is ${claim.label}`,
          description: `[Account] — [is] — [${claim.label}]`,
          status: 'to-create',
          subjectId: accountAtomId,
          predicateId: isId,
          objectId: claim.atomId,
        });
      }
    }

    // Item A
    if (gameExists) {
      existing.push({
        id: 'game-nested', type: 'nested-triple',
        label: `(has alias) is player of ${gameLabel}`,
        description: `Nested: (alias triple) — [is player of] — [${gameLabel}]`,
        status: 'existing',
      });
    } else {
      toCreate.push({
        id: 'game-nested', type: 'nested-triple',
        label: `(has alias) is player of ${gameLabel}`,
        description: `Nested: (alias triple) — [is player of] — [${gameLabel}]`,
        status: 'to-create',
        subjectId: aliasTripleId,
        predicateId: isPlayerOfId,
        objectId: gamesId,
      });
    }

    // Item C: context-nested uses the first claim's triple id
    // (only checkable if that triple exists; otherwise it cannot exist)
    let contextExists = false;
    if (firstKnownClaimTripleId) {
      contextExists = await checkTripleExists(
        BigInt(firstKnownClaimTripleId), BigInt(inId), BigInt(gamesId)
      );
    }
    if (contextExists && firstKnownClaimTripleId) {
      existing.push({
        id: 'context-nested', type: 'nested-triple',
        label: `(is ${firstClaimLabel}) in ${gameLabel}`,
        description: `Nested: (claim triple) — [in] — [${gameLabel}]`,
        status: 'existing',
      });
    } else {
      toCreate.push({
        id: 'context-nested', type: 'nested-triple',
        label: `(is ${firstClaimLabel}) in ${gameLabel}`,
        description: `Nested: (claim triple) — [in] — [${gameLabel}]`,
        status: 'to-create',
        // Note: no subjectId — depends on first claim's tripleId resolved at creation time
      });
    }

    setExistingItems(existing);
    setToCreateItems(toCreate);
    setRegistrationPhase('ready-to-initialize');
  }, [accountAtomId, aliasTripleId, pseudoAtomId, pseudo, selectedGuild, aliases, activeGame, guilds,
      checkTripleExists, computeTripleId]);

  // ─── Trigger existence checks when entering loading-existing ──────────────────
  useEffect(() => {
    if (
      registrationPhase === 'loading-existing' &&
      accountAtomId &&
      aliasTripleId &&
      pseudoAtomId
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
    setIsInitializing(false);
    setCurrentInitIndex(0);
    setInitError(undefined);
    setConsentAlreadyAccepted(false);
    setRgpdChecked(false);
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
    if (useExistingAlias && selectedExistingAlias) {
      // Existing alias: find by atomId, extract display name, skip pseudo/alias/guild creation
      // but still run the consent flow (sign + consent atom + accepted triple) if not already accepted
      const selectedAlias = aliases.find(a => a.atomId === selectedExistingAlias);
      if (!selectedAlias) return;
      let label = selectedAlias.pseudo;
      try { label = JSON.parse(selectedAlias.pseudo).name || selectedAlias.pseudo; } catch { /* use raw */ }
      setPseudo(label);
      setPseudoAtomId(selectedAlias.atomId);
      setAliasTripleId(selectedAlias.tripleId);
      // accountAtomId already set in useEffect (= playerAtomId)
      setRegistrationPhase('creating-identity');
      register(label); // useRegisterPlayer skips pseudo/account/alias/guild, runs consent if needed
      return;
    }

    const username = pseudoInput.trim();
    if (!username) return;
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
    if (!accountAtomId || !aliasTripleId) return;
    const gamesId = activeGame?.atomId;
    if (!gamesId) return;
    const claims = activeGame?.claims ?? [];
    if (claims.length === 0) return;

    const pending = toCreateItems.filter(i => i.status === 'to-create');
    if (pending.length === 0) {
      setRegistrationPhase('complete');
      return;
    }

    setIsInitializing(true);
    setInitError(undefined);
    setRegistrationPhase('creating-claims');

    const isId = PREDICATES.IS;
    const isPlayerOfId = PREDICATES.IS_PLAYER_OF;
    const inId = PREDICATES.IN;
    const isMemberOfId = PREDICATES.IS_MEMBER_OF;

    try {
      // computeTripleId is deterministic (pure SDK calculation — no RPC call)
      // Resolve the first claim's triple id upfront for use in context-nested
      const computedFirstClaimId = await computeTripleId(
        BigInt(accountAtomId), BigInt(isId), BigInt(claims[0].atomId)
      );
      const resolvedFirstClaimTripleId = `0x${computedFirstClaimId.toString(16)}`;

      // Build the batch from all to-create items
      const triplesToCreate: TripleToCreate[] = [];
      const batchedIds: string[] = [];

      for (const item of pending) {
        if (item.id.startsWith('claim-')) {
          // find the matching claim by atomId suffix
          const claimAtomId = item.id.slice('claim-'.length);
          triplesToCreate.push({ subjectId: BigInt(accountAtomId), predicateId: BigInt(isId), objectId: BigInt(claimAtomId) });
          batchedIds.push(item.id);
        } else if (item.id === 'game-nested') {
          triplesToCreate.push({ subjectId: BigInt(aliasTripleId), predicateId: BigInt(isPlayerOfId), objectId: BigInt(gamesId) });
          batchedIds.push(item.id);
        } else if (item.id === 'context-nested') {
          triplesToCreate.push({ subjectId: BigInt(resolvedFirstClaimTripleId), predicateId: BigInt(inId), objectId: BigInt(gamesId) });
          batchedIds.push(item.id);
        } else if (item.id === 'guild-nested' && selectedGuild) {
          triplesToCreate.push({ subjectId: BigInt(aliasTripleId), predicateId: BigInt(isMemberOfId), objectId: BigInt(selectedGuild) });
          batchedIds.push(item.id);
        }
      }

      if (triplesToCreate.length === 0) {
        setIsInitializing(false);
        setRegistrationPhase('complete');
        return;
      }

      // Mark all as creating
      setToCreateItems(prev => prev.map(i => batchedIds.includes(i.id) ? { ...i, status: 'creating' } : i));

      // Single transaction — one wallet confirmation for all triples
      await batchCreateTriple(triplesToCreate);

      // Mark all as created; tag each claim triple with its resolved triple id
      setToCreateItems(prev => prev.map(i => {
        if (!batchedIds.includes(i.id)) return i;
        if (i.id.startsWith('claim-')) {
          const claimAtomId = i.id.slice('claim-'.length);
          // reuse computeTripleId synchronously — but it returns a Promise, so we store resolvedFirstClaimTripleId only for the first claim
          const resultTripleId = claimAtomId === claims[0].atomId ? resolvedFirstClaimTripleId : undefined;
          return { ...i, status: 'created', ...(resultTripleId ? { resultTripleId } : {}) };
        }
        return { ...i, status: 'created' };
      }));

      setIsInitializing(false);
      setRegistrationPhase('complete');
    } catch (err) {
      setToCreateItems(prev => prev.map(i => i.status === 'creating' ? { ...i, status: 'error' } : i));
      setInitError(err instanceof Error ? err.message : String(err));
      setIsInitializing(false);
      setRegistrationPhase('ready-to-initialize');
    }
  }, [accountAtomId, aliasTripleId, toCreateItems, selectedGuild, activeGame,
      batchCreateTriple, computeTripleId]);

  const isValidateDisabled =
    (useExistingAlias ? !selectedExistingAlias : !pseudoInput.trim()) ||
    !termsChecked ||
    (!rgpdChecked && !consentAlreadyAccepted);

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
              <span className={styles.highlight}>Object</span>] (For example, a triple could be : [player42] ⇒ [is] ⇒ [fairplay])
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
                onSwitchNetwork={switchNetwork}
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
                  <div className={styles.formRowControl}>
                    {hasExistingAliases ? (
                      <>
                        <div className={styles.aliasModeButtons}>
                          <button
                            className={`${styles.aliasModeBtn} ${useExistingAlias ? styles.aliasModeActive : styles.aliasModeInactive}`}
                            onClick={() => setUseExistingAlias(true)}
                          >
                            Existing username
                          </button>
                          <button
                            className={`${styles.aliasModeBtn} ${!useExistingAlias ? styles.aliasModeActive : styles.aliasModeInactive}`}
                            onClick={() => setUseExistingAlias(false)}
                          >
                            Create username
                          </button>
                        </div>
                        {useExistingAlias ? (
                          <>
                            <p className={styles.selectHint}>
                              Your account already has a username for at least one game in the Player Map. Do you want to use one of them to confirm you are a player of{' '}
                              <span className={styles.gameNameHighlight}>
                                {activeGame?.label ?? 'this game'}
                              </span>?
                            </p>
                            <select
                              value={selectedExistingAlias}
                              onChange={e => setSelectedExistingAlias(e.target.value)}
                              className={styles.select}
                            >
                              <option value="">— Select a username —</option>
                              {aliases.map(a => {
                                let label = a.pseudo;
                                try { label = JSON.parse(a.pseudo).name || a.pseudo; } catch { /* use raw */ }
                                return (
                                  <option key={a.atomId} value={a.atomId}>
                                    {label}{a.isPrimary ? "" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </>
                        ) : (
                          <input
                            type="text"
                            value={pseudoInput}
                            onChange={e => setPseudoInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !isValidateDisabled) handleValidate(); }}
                            className={styles.input}
                            placeholder="Username"
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
                        placeholder="Username"
                      />
                    )}
                  </div>
                </div>

                {/* Guild row */}
                {guilds.length > 0 && (
                  <div className={styles.formRow}>
                    <div className={styles.formRowLabel}>
                      <span>Are you a member of a guild in <span className={styles.gameNameHighlight}>{activeGame?.label ?? 'this game'} </span> ?</span>
                    </div>
                    <div className={styles.formRowControl}>
                      <select
                        value={selectedGuild}
                        onChange={e => setSelectedGuild(e.target.value)}
                        className={styles.select}
                      >
                        <option value="">— No guild —</option>
                        {guilds.map(g => (
                          <option key={g.atomId} value={g.atomId}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Profile picture row — hidden when reusing an existing alias */}
                {!useExistingAlias && (
                <div className={styles.formRow}>
                  <div className={styles.formRowLabel}>
                    <span className={styles.rowTitle}>Player profile picture</span>
                    <span className={styles.rowDesc}>This image will be used as the player's profile picture and can't be replaced or added later.</span>
                  </div>
                  <div className={styles.formRowControl}>
                    <div className={styles.uploadRow}>
                      <button
                        className={styles.uploadBtn}
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        UPLOAD
                      </button>
                      {imagePreview && (
                        <img src={imagePreview} alt="Preview" className={styles.imagePreviewThumb} />
                      )}
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
                )} {/* end !useExistingAlias */}

                {/* Terms */}
                <div className={styles.termsBox}>

                  <div className={styles.termsCheckRow}>
                    <input
                      id="terms-checkbox"
                      type="checkbox"
                      className={styles.termsCheckbox}
                      checked={termsChecked}
                      onChange={e => setTermsChecked(e.target.checked)}
                    />
                    <label htmlFor="terms-checkbox" className={styles.termsCheckLabel}>
                      <p>Users are solely responsible for any information, data, or content they record on the blockchain through the Service.</p>
                      <p>Users agree not to create or publish profiles that : impersonate another person, contain defamatory information, violate privacy rights, infringe intellectual property rights or violate applicable laws.</p>

                      <p>The Company does not review, approve, or moderate all information recorded on the blockchain through the Service.</p>
                    </label>
                  </div>
                </div>

                {consentAlreadyAccepted ? (
                  <div className={styles.consentAccepted}>
                    <span>✓ You have already accepted the Terms of Services and Privacy Policy.</span>
                  </div>
                ) : (
                  <div className={styles.termsCheckRow}>
                    <input
                      id="rgpd-checkbox"
                      type="checkbox"
                      className={styles.termsCheckbox}
                      checked={rgpdChecked}
                      onChange={e => setRgpdChecked(e.target.checked)}
                    />
                    <label htmlFor="rgpd-checkbox" className={styles.termsCheckLabel}>
                      I confirm that I have read, consent and agree to the Player Map{' '}
                      <a
                        href="https://playermap.box/terms-of-service/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.consentLink}
                      >
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a
                        href="https://playermap.box/privacy-policy/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.consentLink}
                      >
                        Privacy Policy
                      </a>
                      .
                    </label>
                  </div>
                )}

                {/* Validate */}
                <button
                  className={styles.validateBtn}
                  onClick={handleValidate}
                  disabled={isValidateDisabled}
                >
                  VALIDATE
                </button>
              </div>
            ) : (
              /* ── Progress / Phase 2 / Complete ─────────────────────────────── */
              <div className={styles.formBlock}>
                <button className={styles.backLink} onClick={handleBack}>
                  ← Back
                </button>
                <PlayerCreationProgress
                  walletAddress={walletAddress}
                  gameLabel={activeGame?.label ?? ''}
                  resolvedClaims={activeGame?.claims ?? []}
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
                    ? guilds.find(g => g.atomId === selectedGuild)?.label
                    : undefined}
                  existingItems={existingItems}
                  toCreateItems={toCreateItems}
                  onInitialize={handleInitialize}
                  isInitializing={isInitializing}
                  currentInitIndex={currentInitIndex}
                  initError={initError}
                  consentAlreadyAccepted={consentAlreadyAccepted}
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

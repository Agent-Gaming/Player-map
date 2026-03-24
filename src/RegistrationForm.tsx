import React, { useState, useEffect, useMemo } from "react";
import IntuitionLogo from "./assets/img/logo.svg";
import PlayerCreationProgress from "./PlayerCreationProgress";
import { useNetworkCheck } from "./shared/hooks/useNetworkCheck";
import { NetworkSwitchMessage } from "./shared/components/NetworkSwitchMessage";
import { DefaultPlayerMapConstants } from "./types/PlayerMapConfig";
import styles from "./RegistrationForm.module.css";
import { usePlayerAliases } from './hooks/usePlayerAliases';
import { useRegisterPlayer } from './hooks/useRegisterPlayer';
import { useBatchCreateTriple } from './hooks/useBatchCreateTriple';
import { RegistrationPhase, ClaimOption } from './types/alias';

interface RegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  walletConnected?: any;
  walletAddress?: string;
  wagmiConfig?: any;
  walletHooks?: {
    useAccount?: any;
    useConnect?: any;
    useWalletClient?: any;
    usePublicClient?: any;
  };
  constants: DefaultPlayerMapConstants;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  isOpen,
  onClose,
  walletConnected,
  walletAddress,
  wagmiConfig,
  constants,
}) => {
  const publicClient = wagmiConfig?.publicClient;

  // ─── Phase 1 state ──────────────────────────────────────────────────────────
  const [registrationPhase, setRegistrationPhase] = useState<RegistrationPhase>('input');
  const [pseudoInput, setPseudoInput] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [pseudoAtomId, setPseudoAtomId] = useState<string | undefined>(undefined);

  // ─── Phase 2 state ──────────────────────────────────────────────────────────
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [createdClaimIds, setCreatedClaimIds] = useState<string[]>([]);
  const [isCreatingClaims, setIsCreatingClaims] = useState(false);
  const [currentClaimIndex, setCurrentClaimIndex] = useState(0);
  const [claimError, setClaimError] = useState<string | undefined>(undefined);

  // ─── Hooks ──────────────────────────────────────────────────────────────────
  const { aliases, playerAtomId, isLoading: aliasesLoading } = usePlayerAliases({
    walletAddress,
    constants,
  });

  const {
    register,
    reset: resetIdentity,
    step: identityStep,
    isRegistering,
    error: identityError,
    pseudoAtomId: reg_pseudoAtomId,
  } = useRegisterPlayer({
    walletConnected,
    walletAddress,
    constants,
    publicClient,
  });

  const { batchCreateTriple } = useBatchCreateTriple({
    walletConnected,
    walletAddress,
    publicClient,
    constants,
  });

  const { isCorrectNetwork, currentChainId, targetChainId } = useNetworkCheck({
    walletConnected,
    publicClient: wagmiConfig?.publicClient,
  });

  // ─── Available claims from constants (exclude entries with null objectId or no label) ──
  const availableClaims: ClaimOption[] = useMemo(() => {
    return Object.entries(constants.PLAYER_TRIPLE_TYPES)
      .filter(([, v]) => v.objectId !== null && v.label)
      .map(([id, v]) => ({
        id,
        label: v.label as string,
        predicateAtomId: v.predicateId as string,
        objectAtomId: v.objectId as string,
      }));
  }, [constants.PLAYER_TRIPLE_TYPES]);

  // ─── Auto-transition: returning user already has account atom ────────────────
  useEffect(() => {
    if (!aliasesLoading && playerAtomId && registrationPhase === 'input') {
      setRegistrationPhase('identity-created');
      const primary = aliases.find(a => a.isPrimary);
      if (primary) {
        setPseudo(primary.pseudo);
        setPseudoAtomId(primary.atomId);
      }
    }
  }, [playerAtomId, aliasesLoading, aliases, registrationPhase]);

  // ─── Transition after Phase 1 success ────────────────────────────────────────
  useEffect(() => {
    if (identityStep === 'success' && registrationPhase === 'creating-identity') {
      if (reg_pseudoAtomId) setPseudoAtomId(reg_pseudoAtomId);
      setRegistrationPhase('identity-created');
    }
  }, [identityStep, registrationPhase, reg_pseudoAtomId]);

  // ─── Phase 1 handlers ────────────────────────────────────────────────────────
  const handleCreateIdentity = () => {
    if (!pseudoInput.trim()) return;
    const p = pseudoInput.trim();
    setPseudo(p);
    setRegistrationPhase('creating-identity');
    register(p);
  };

  // Retry: call register again with same pseudo — preserves pseudoAtomId in hook state
  const handleRetryIdentity = () => { register(pseudo); };

  // Cancel: clear everything and go back to input
  const handleResetIdentity = () => {
    resetIdentity();
    setRegistrationPhase('input');
    setPseudo('');
    setPseudoInput('');
    setPseudoAtomId(undefined);
  };

  // ─── Phase 2 handlers ────────────────────────────────────────────────────────
  const handleToggleClaim = (id: string) => {
    setSelectedClaimIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateSelectedClaims = async () => {
    if (!pseudoAtomId) return;

    // Only create claims that haven't been successfully created yet
    const pending = availableClaims.filter(
      c => selectedClaimIds.includes(c.id) && !createdClaimIds.includes(c.id)
    );
    if (pending.length === 0) {
      setRegistrationPhase('complete');
      return;
    }

    setIsCreatingClaims(true);
    setClaimError(undefined);
    setRegistrationPhase('creating-claims');

    for (let i = 0; i < pending.length; i++) {
      setCurrentClaimIndex(i);
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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.walletInfo}>
          <div>
            Wallet:{" "}
            {walletAddress
              ? walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4)
              : "Not connected"}
          </div>
        </div>

        <button onClick={onClose} className={styles.closeBtn}>×</button>

        <img src={IntuitionLogo} alt="Intuition Logo" className={styles.logo} />
        <h2 className={styles.title}>Create Your Player</h2>

        {!isCorrectNetwork ? (
          <NetworkSwitchMessage
            currentChainId={currentChainId}
            targetChainId={targetChainId}
          />
        ) : (
          <PlayerCreationProgress
            walletAddress={walletAddress}
            constants={constants}
            registrationPhase={registrationPhase}
            pseudoInput={pseudoInput}
            onPseudoInputChange={setPseudoInput}
            onCreateIdentity={handleCreateIdentity}
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
        )}
      </div>
    </div>
  );
};

export default RegistrationForm;

import React from "react";
import { PlayerAlias, RegistrationPhase, IdentityCreationStep, InitItem } from './types/alias';
import styles from './PlayerCreationProgress.module.css';


interface PlayerCreationProgressProps {
  walletAddress?: string;

  // Game context
  gameLabel: string;
  resolvedClaims: Array<{ atomId: string; label: string; imageUrl?: string }>;

  // Phase state machine
  registrationPhase: RegistrationPhase;

  // Phase 1 — identity creation
  pseudoInput: string;
  onPseudoInputChange: (val: string) => void;
  onCreateIdentity: () => void;
  identityStep: IdentityCreationStep;
  isCreatingIdentity: boolean;
  identityError?: string;
  onRetryIdentity: () => void;
  onResetIdentity: () => void;
  hasGuild: boolean;
  guildName?: string;

  // Context after Phase 1
  pseudo: string;
  aliases?: PlayerAlias[];
  aliasesLoading?: boolean;

  // Phase 2 — Player Initialization
  existingItems: InitItem[];
  toCreateItems: InitItem[];
  onInitialize: () => void;
  isInitializing: boolean;
  currentInitIndex: number;
  initError?: string;

  // Consent
  consentAlreadyAccepted?: boolean;
}

// ─── Triple chip helpers ──────────────────────────────────────────────────────

type ChunkAtom      = { kind: 'atom';      circle: boolean; label: string; image?: string }
type ChunkPredicate = { kind: 'predicate'; label: string }
type Chunk          = ChunkAtom | ChunkPredicate

const profil: ChunkAtom = { kind: 'atom', circle: true, label: 'Profil_ID' }
const pred  = (label: string): ChunkPredicate => ({ kind: 'predicate', label })
const atom  = (label: string, image?: string): ChunkAtom      => ({ kind: 'atom', circle: false, label, image })

function getItemChunks(
  item: InitItem,
  pseudo: string,
  guildName: string | undefined,
  gameLabel: string,
  resolvedClaims: Array<{ atomId: string; label: string; imageUrl?: string }>
): Chunk[] {
  switch (item.id) {
    case 'pseudo-atom':
      return [atom(pseudo || item.label, item.image)]
    case 'account-atom':
      return [profil]
    case 'alias-triple':
      return [profil, pred('has alias'), atom(pseudo, item.image)]
    case 'guild-nested':
      return [profil, pred('has alias'), atom(pseudo, item.image), pred('is member of'), atom(guildName ?? '…')]
    case 'fairplay': {
      const claimLabel = resolvedClaims.find(c => c.atomId === item.subjectId || c.atomId === item.objectId)?.label ?? item.label
      return [profil, pred('is'), atom(claimLabel, item.image)]
    }
    case 'game-nested':
      return [profil, pred('has alias'), atom(pseudo, item.image), pred('is player of'), atom(gameLabel)]
    case 'context-nested': {
      const claimLabel = resolvedClaims.find(c => c.atomId === item.objectId)?.label ?? item.label
      return [profil, pred('is'), atom(claimLabel, item.image), pred('in'), atom(gameLabel)]
    }
    default:
      return [atom(item.label, item.image)]
  }
}

// ─── Identity progress bar ──────────────────────────────────────────────────
const IDENTITY_STEPS: IdentityCreationStep[] = [
  'idle',
  'signing-consent',
  'creating-consent-atom',
  'creating-pseudo-atom',
  'fetching-account-atom',
  'creating-account-atom',
  'creating-alias-triple',
  'creating-accepted-triple',
  'creating-guild-membership',
  'success',
];

const statusLabel: Partial<Record<IdentityCreationStep, string>> = {
  'signing-consent':           'Signing terms and conditions (no fees)...',
  'creating-consent-atom':     'Recording legal proof...',
  'creating-pseudo-atom':      'Creating username atom...',
  'fetching-account-atom':     'Checking account...',
  'creating-account-atom':     'Creating account atom...',
  'creating-alias-triple':     'Creating alias link...',
  'creating-accepted-triple':  'Linking consent...',
  'creating-guild-membership': 'Creating guild membership...',
};

const IdentityProgressBar = ({
  step,
  hasGuild,
  consentAlreadyAccepted,
}: {
  step: IdentityCreationStep;
  hasGuild: boolean;
  consentAlreadyAccepted: boolean;
}) => {
  const current = IDENTITY_STEPS.indexOf(step);

  const uiSteps = [
    ...(!consentAlreadyAccepted ? [
      {
        label: 'Consent',
        doneAfter: IDENTITY_STEPS.indexOf('creating-consent-atom'),
        activeOn: ['signing-consent', 'creating-consent-atom'],
      },
    ] : []),
    {
      label: 'Username atom',
      doneAfter: IDENTITY_STEPS.indexOf('creating-pseudo-atom'),
      activeOn: ['creating-pseudo-atom'],
    },
    {
      label: 'Account',
      doneAfter: IDENTITY_STEPS.indexOf('creating-account-atom'),
      activeOn: ['fetching-account-atom', 'creating-account-atom'],
    },
    {
      label: 'Alias link',
      doneAfter: IDENTITY_STEPS.indexOf('creating-alias-triple'),
      activeOn: ['creating-alias-triple'],
    },
    ...(!consentAlreadyAccepted ? [
      {
        label: 'Consent record',
        doneAfter: IDENTITY_STEPS.indexOf('creating-accepted-triple'),
        activeOn: ['creating-accepted-triple'],
      },
    ] : []),
    ...(hasGuild ? [{
      label: 'Guild membership',
      doneAfter: IDENTITY_STEPS.indexOf('creating-guild-membership'),
      activeOn: ['creating-guild-membership'],
    }] : []),
  ];

  return (
    <div className={styles.progressBar}>
      <div className={styles.progressSteps}>
        {uiSteps.map((s, i) => {
          const isActive = (s.activeOn as string[]).includes(step);
          const isDone   = current > s.doneAfter;
          return (
            <div key={i} className={styles.progressStep}>
              <div className={[
                styles.stepCircle,
                isDone   ? styles.stepCircleDone   : '',
                isActive ? styles.stepCircleActive : '',
              ].join(' ')}>
                {isDone ? '✓' : i + 1}
              </div>
              <p className={styles.stepLabel}>{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlayerCreationProgress: React.FC<PlayerCreationProgressProps> = ({
  walletAddress,
  gameLabel,
  resolvedClaims,
  registrationPhase,
  pseudoInput,
  onPseudoInputChange,
  onCreateIdentity,
  identityStep,
  isCreatingIdentity,
  identityError,
  onRetryIdentity,
  onResetIdentity,
  hasGuild,
  guildName,
  pseudo,
  aliases,
  aliasesLoading,
  existingItems,
  toCreateItems,
  onInitialize,
  isInitializing,
  currentInitIndex,
  initError,
  consentAlreadyAccepted,
}) => {

  if (!walletAddress) {
    return (
      <p className={styles.errorText}>Please connect your wallet first</p>
    );
  }

  // ─── Phase: creating-identity ─────────────────────────────────────────────
  if (registrationPhase === 'creating-identity') {
    return (
      <div>
        <IdentityProgressBar step={identityStep} hasGuild={hasGuild} consentAlreadyAccepted={!!consentAlreadyAccepted} />

        {identityStep !== 'error' ? (
          <p className={styles.statusText}>
            {statusLabel[identityStep] ?? '...'}
          </p>
        ) : (
          <div className={styles.errorBlock}>
            <p className={styles.errorText}>{identityError}</p>
            <div className={styles.errorActions}>
              <button className={styles.btnRetry} onClick={onRetryIdentity}>
                Retry
              </button>
              <button className={styles.btnCancel} onClick={onResetIdentity}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Phase: complete ──────────────────────────────────────────────────────
  if (registrationPhase === 'complete') {
    return (
      <div className={styles.completeBox}>
        <p className={styles.completeIcon}>✅</p>
        <h3 className={styles.completeTitle}>Profile complete!</h3>
        {pseudo && (
          <p className={styles.completeSubtext}>
            Username: <strong className={styles.completeUsername}>{pseudo}</strong>
          </p>
        )}
      </div>
    );
  }

  // ─── Phase: loading-existing ──────────────────────────────────────────────
  if (registrationPhase === 'loading-existing') {
    return (
      <div className={styles.loadingExisting}>
        <p className={styles.loadingExistingText}>Checking existing profile elements...</p>
      </div>
    );
  }

  // ─── Phases: ready-to-initialize + creating-claims ────────────────────────
  if (registrationPhase === 'ready-to-initialize' || registrationPhase === 'creating-claims') {
    const pendingCount = toCreateItems.filter(i => i.status === 'to-create').length;

    return (
      <div>
        <p className={styles.title2}>PLAYER INITIALIZATION</p>

        {/* Zone 1 — Created */}
        {existingItems.length > 0 && (
          <div className={styles.initZone}>
            <p className={styles.initZoneLabel}>Created</p>
            <div className={styles.initItemList}>
              {existingItems.map(item => (
                <div key={item.id} className={styles.initItem}>
                  <div className={styles.tripleRow}>
                    {getItemChunks(item, pseudo, guildName, gameLabel, resolvedClaims).map((chunk, i) =>
                      chunk.kind === 'atom' ? (
                        <span key={i} className={styles.atomChip}>
                          {chunk.image
                            ? <img src={chunk.image} alt={chunk.label} className={styles.atomChipImage} />
                            : chunk.circle
                            ? <span className={styles.atomChipCircle} />
                            : <span className={styles.atomChipSquare} />
                          }
                          <span>{chunk.label}</span>
                        </span>
                      ) : (
                        <span key={i} className={styles.predicateLabel}>{chunk.label}</span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zone 2 — To create */}
        {toCreateItems.length > 0 && (
          <div className={styles.initZone}>
            <p className={styles.initZoneLabel}>To create</p>
            <div className={styles.initItemList}>
              {toCreateItems.map((item, idx) => {
                const isActive = isInitializing && idx === currentInitIndex;
                const isDone   = item.status === 'created';
                const isErr    = item.status === 'error';
                return (
                  <div
                    key={item.id}
                    className={[
                      styles.initItem,
                      isDone   ? styles.initItemDone   : '',
                      isActive ? styles.initItemActive : '',
                      isErr    ? styles.initItemError  : '',
                    ].join(' ')}
                  >
                    <span className={[
                      styles.initItemIcon,
                      isDone   ? styles.initItemIconDone   : '',
                      isActive ? styles.initItemIconActive : '',
                      isErr    ? styles.initItemIconError  : '',
                    ].join(' ')}>
                      {isDone ? '✓' : isActive ? '⟳' : '○'}
                    </span>
                    <div className={styles.tripleRow}>
                      {getItemChunks(item, pseudo, guildName, gameLabel, resolvedClaims).map((chunk, i) =>
                        chunk.kind === 'atom' ? (
                          <span key={i} className={styles.atomChip}>
                            {chunk.circle
                              ? <span className={styles.atomChipCircle} />
                              : <span className={styles.atomChipSquare} />
                            }
                            <span>{chunk.label}</span>
                          </span>
                        ) : (
                          <span key={i} className={styles.predicateLabel}>{chunk.label}</span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {initError && <p className={styles.claimError}>Error: {initError}</p>}

        {/* Action */}
        {!isInitializing && (
          <div className={styles.actionsRow}>
            <button
              className={styles.btnCreateClaims}
              onClick={onInitialize}
              disabled={toCreateItems.length > 0 && pendingCount === 0 && !initError}
            >
              {initError
                ? 'Retry'
                : pendingCount > 0
                  ? `Validate (${pendingCount})`
                  : 'Continue'}
            </button>
          </div>
        )}
        {isInitializing && (
          <p className={styles.statusText}>
            Creating {currentInitIndex + 1} / {toCreateItems.length}...
          </p>
        )}
      </div>
    );
  }

  return null;
};

export default PlayerCreationProgress;

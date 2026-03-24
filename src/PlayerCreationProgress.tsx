import React from "react";
import { DefaultPlayerMapConstants } from './types/PlayerMapConfig';
import { PlayerAlias, RegistrationPhase, IdentityCreationStep, ClaimOption } from './types/alias';

interface PlayerCreationProgressProps {
  walletAddress?: string;
  constants: DefaultPlayerMapConstants;

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

  // Context after Phase 1
  pseudo: string;
  aliases?: PlayerAlias[];
  aliasesLoading?: boolean;

  // Phase 2 — claims selection + creation
  availableClaims: ClaimOption[];
  selectedClaimIds: string[];
  createdClaimIds: string[];
  onToggleClaim: (id: string) => void;
  onCreateSelectedClaims: () => void;
  onSkipClaims: () => void;
  isCreatingClaims: boolean;
  currentClaimIndex: number;
  claimError?: string;
}

// Ordered steps for phase 1 progress logic
const IDENTITY_STEPS: IdentityCreationStep[] = [
  'idle',
  'creating-pseudo-atom',
  'fetching-account-atom',
  'creating-account-atom',
  'creating-alias-triple',
  'success',
];

const IdentityProgressBar = ({ step }: { step: IdentityCreationStep }) => {
  const current = IDENTITY_STEPS.indexOf(step);

  const uiSteps = [
    { label: 'Pseudo atom', doneAfter: IDENTITY_STEPS.indexOf('creating-pseudo-atom'), activeOn: ['creating-pseudo-atom'] },
    { label: 'Account',     doneAfter: IDENTITY_STEPS.indexOf('creating-account-atom'), activeOn: ['fetching-account-atom', 'creating-account-atom'] },
    { label: 'Alias triple',doneAfter: IDENTITY_STEPS.indexOf('creating-alias-triple'), activeOn: ['creating-alias-triple'] },
  ];

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        {uiSteps.map((s, i) => {
          const isActive = (s.activeOn as string[]).includes(step);
          const isDone = current > s.doneAfter;
          return (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{
                width: "30px",
                height: "30px",
                borderRadius: "15px",
                backgroundColor: isDone ? "#4CAF50" : isActive ? "#FFD32A" : "#2e2e40",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                color: isDone || isActive ? "#000" : "#fff",
                fontWeight: "bold",
              }}>
                {isDone ? "✓" : i + 1}
              </div>
              <p style={{ fontSize: "0.78em", marginTop: "5px", color: "#aaa" }}>{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const statusLabel: Partial<Record<IdentityCreationStep, string>> = {
  'creating-pseudo-atom':   "Création de l'atom pseudo…",
  'fetching-account-atom':  "Vérification du compte…",
  'creating-account-atom':  "Création de l'atom compte…",
  'creating-alias-triple':  "Liaison has alias…",
};

const PlayerCreationProgress: React.FC<PlayerCreationProgressProps> = ({
  walletAddress,
  registrationPhase,
  pseudoInput,
  onPseudoInputChange,
  onCreateIdentity,
  identityStep,
  isCreatingIdentity,
  identityError,
  onRetryIdentity,
  onResetIdentity,
  pseudo,
  aliases,
  aliasesLoading,
  availableClaims,
  selectedClaimIds,
  createdClaimIds,
  onToggleClaim,
  onCreateSelectedClaims,
  onSkipClaims,
  isCreatingClaims,
  currentClaimIndex,
  claimError,
}) => {
  if (!walletAddress) {
    return (
      <p style={{ textAlign: "center", color: "#ff4444" }}>
        Please connect your wallet first
      </p>
    );
  }

  // ─── Phase: input ─────────────────────────────────────────────────────────
  if (registrationPhase === 'input') {
    return (
      <div>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9em", textAlign: "left" }}>
            Ton pseudo
          </label>
          <input
            type="text"
            value={pseudoInput}
            onChange={e => onPseudoInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && pseudoInput.trim()) onCreateIdentity(); }}
            placeholder="DarkPlayer42"
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#1e1e30",
              border: "1px solid #333",
              color: "#fff",
              borderRadius: "4px",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <button
            onClick={onCreateIdentity}
            disabled={!pseudoInput.trim()}
            style={{
              padding: "10px 24px",
              backgroundColor: "#FFD32A",
              color: "#000",
              border: "none",
              borderRadius: "5px",
              cursor: !pseudoInput.trim() ? "not-allowed" : "pointer",
              fontWeight: "bold",
              opacity: !pseudoInput.trim() ? 0.6 : 1,
              fontSize: "0.95em",
            }}
          >
            Créer mon identité
          </button>
        </div>
      </div>
    );
  }

  // ─── Phase: creating-identity ─────────────────────────────────────────────
  if (registrationPhase === 'creating-identity') {
    return (
      <div>
        <IdentityProgressBar step={identityStep} />

        {identityStep !== 'error' ? (
          <p style={{ textAlign: "center", color: "#aaa", fontSize: "0.9em", minHeight: "20px" }}>
            {statusLabel[identityStep] ?? '…'}
          </p>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#ff4444", fontSize: "0.85em", marginBottom: "12px" }}>
              {identityError}
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <button
                onClick={onRetryIdentity}
                style={{
                  padding: "6px 16px",
                  backgroundColor: "#FFD32A",
                  color: "#000",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "0.85em",
                }}
              >
                Réessayer
              </button>
              <button
                onClick={onResetIdentity}
                style={{
                  padding: "6px 14px",
                  backgroundColor: "#2e2e40",
                  color: "#ff8888",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.85em",
                }}
              >
                Annuler
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
      <div style={{ textAlign: "center", paddingTop: "8px" }}>
        <p style={{ fontSize: "2em", marginBottom: "8px" }}>✅</p>
        <h3 style={{ color: "#4CAF50", marginBottom: "8px" }}>Profil complet !</h3>
        {pseudo && (
          <p style={{ color: "#aaa" }}>
            Identité : <strong style={{ color: "#FFD32A" }}>{pseudo}</strong>
          </p>
        )}
      </div>
    );
  }

  // ─── Phases: identity-created + creating-claims ───────────────────────────
  const pendingCount = selectedClaimIds.filter(id => !createdClaimIds.includes(id)).length;
  const totalPending = selectedClaimIds.filter(id => !createdClaimIds.includes(id)).length;

  return (
    <div>
      {/* Existing aliases (read-only context) */}
      {aliasesLoading ? (
        <p style={{ color: "#aaa", fontSize: "0.82em", marginBottom: "8px" }}>Chargement…</p>
      ) : aliases && aliases.length > 0 ? (
        <div style={{ marginBottom: "14px" }}>
          <p style={{ fontSize: "0.78em", color: "#aaa", marginBottom: "5px" }}>Tes alias :</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {aliases.map(a => (
              <span
                key={a.tripleId}
                style={{
                  padding: "2px 10px",
                  backgroundColor: "#1e1e30",
                  border: `1px solid ${a.isPrimary ? "#FFD32A" : "#333"}`,
                  borderRadius: "12px",
                  fontSize: "0.82em",
                  color: a.isPrimary ? "#FFD32A" : "#ccc",
                }}
              >
                {a.isPrimary && "★ "}{a.pseudo}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Phase 2: claims creation in progress */}
      {isCreatingClaims ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ color: "#FFD32A", marginBottom: "6px", fontWeight: "bold" }}>
            Création des claims : {currentClaimIndex + 1} / {totalPending}
          </p>
          <p style={{ color: "#aaa", fontSize: "0.85em" }}>Transaction en cours…</p>
        </div>
      ) : (
        <>
          {/* Claims title */}
          <h3 style={{ color: "#FFD32A", marginBottom: "12px", textAlign: "center", fontSize: "0.95em" }}>
            {pseudo ? <><span style={{ color: "#fff" }}>{pseudo}</span> — </> : ''}
            Ajoute des claims à ton profil
          </h3>

          {/* Claims list */}
          {availableClaims.length > 0 ? (
            <div style={{ marginBottom: "14px" }}>
              {availableClaims.map(claim => {
                const isSelected = selectedClaimIds.includes(claim.id);
                const isDone = createdClaimIds.includes(claim.id);
                return (
                  <div
                    key={claim.id}
                    onClick={() => !isDone && onToggleClaim(claim.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      marginBottom: "6px",
                      backgroundColor: isDone ? "#152015" : isSelected ? "#1a1e35" : "#1e1e30",
                      border: `1px solid ${isDone ? "#4CAF50" : isSelected ? "#FFD32A" : "#333"}`,
                      borderRadius: "4px",
                      cursor: isDone ? "default" : "pointer",
                      transition: "background-color 0.15s, border-color 0.15s",
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "3px",
                      border: `2px solid ${isDone ? "#4CAF50" : isSelected ? "#FFD32A" : "#555"}`,
                      backgroundColor: isDone ? "#4CAF50" : isSelected ? "#FFD32A" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "0.72em",
                      color: "#000",
                      fontWeight: "bold",
                    }}>
                      {(isDone || isSelected) && "✓"}
                    </div>
                    {/* Label */}
                    <span style={{ fontSize: "0.88em", color: isDone ? "#88cc88" : "#e0e0e0" }}>
                      {pseudo && (
                        <span style={{ color: isDone ? "#88cc88" : "#FFD32A" }}>{pseudo} </span>
                      )}
                      {claim.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "#aaa", fontSize: "0.85em", marginBottom: "14px" }}>
              Aucun claim disponible.
            </p>
          )}

          {/* Error */}
          {claimError && (
            <p style={{ color: "#ff4444", fontSize: "0.8em", marginBottom: "8px" }}>
              Erreur : {claimError}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "4px" }}>
            <button
              onClick={onCreateSelectedClaims}
              disabled={pendingCount === 0}
              style={{
                padding: "8px 18px",
                backgroundColor: "#FFD32A",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                cursor: pendingCount === 0 ? "not-allowed" : "pointer",
                fontWeight: "bold",
                opacity: pendingCount === 0 ? 0.5 : 1,
                fontSize: "0.88em",
              }}
            >
              {claimError ? 'Réessayer' : `Créer les claims${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            </button>
            <button
              onClick={onSkipClaims}
              style={{
                padding: "8px 16px",
                backgroundColor: "#2e2e40",
                color: "#bbb",
                border: "1px solid #444",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.88em",
              }}
            >
              Passer
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PlayerCreationProgress;

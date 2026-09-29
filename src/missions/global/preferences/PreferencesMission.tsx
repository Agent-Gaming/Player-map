import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import CheckboxGroup from './components/CheckboxGroup';
import { usePreferencesCompletion } from './hooks/usePreferencesCompletion';
import { usePreferencesDraft } from './hooks/usePreferencesDraft';
import { usePreferencesSubmission } from './hooks/usePreferencesSubmission';
import { PREFERENCE_QUESTIONS } from './player-preferences-questionnaire.config';
import styles from './PreferencesMission.module.css';

interface PreferencesMissionProps {
  isOpen: boolean;
  walletConnected?: any;
  walletAddress?: string;
  onClose: () => void;
}

type FlowPhase = 'intro' | 'steps' | 'submitting' | 'done';

// Simpler sibling of ArchetypeMission.tsx: one question type (checkboxes),
// no intensity/direction, no archetype-style reveal — just confirm the
// questionnaire is saved so the user can go claim it from the mission card.
const PreferencesMission: React.FC<PreferencesMissionProps> = ({
  isOpen,
  walletConnected,
  walletAddress,
  onClose,
}) => {
  const { completion, isLoading: completionLoading, refetch: refetchCompletion } =
    usePreferencesCompletion(walletAddress);

  const [phase, setPhase] = useState<FlowPhase>('steps');

  // Same per-open intro-vs-steps decision as ArchetypeMission.tsx — this
  // component stays mounted and toggles isOpen, so this must be
  // re-evaluated every time the mission is (re)launched, not just once per
  // mount. The intro always reappears on relaunch as long as the mission
  // isn't completed — waits for completion to actually resolve (not just
  // !completionLoading at the moment isOpen flips) so a completed player
  // isn't briefly shown the intro before completion data arrives. Guarded
  // against re-deciding while already 'submitting'/'done' so closing
  // mid-submit and reopening doesn't clobber that state.
  const introDecidedForThisOpenRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      introDecidedForThisOpenRef.current = false;
      return;
    }
    if (introDecidedForThisOpenRef.current || !walletAddress || completionLoading) return;
    introDecidedForThisOpenRef.current = true;
    if (phase === 'submitting' || phase === 'done') return;
    setPhase(completion?.completed ? 'steps' : 'intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, walletAddress, completionLoading, completion?.completed]);

  const draft = usePreferencesDraft(walletAddress);
  const { submit, isSubmitting, error: submitError } = usePreferencesSubmission({
    walletConnected,
    walletAddress,
  });

  const steps = draft.steps;
  const currentStep = steps[draft.currentStepIndex];
  const isLastStep = draft.currentStepIndex === steps.length - 1;

  // The subgraph is usually a few seconds behind right after the depositBatch
  // tx confirms — poll instead of trusting a single refetch (same pattern as
  // ArchetypeMission.tsx's pollForArchetype).
  const pollForCompletion = useCallback(async (): Promise<boolean> => {
    const ATTEMPTS = 8;
    const DELAY_MS = 2500;
    for (let i = 0; i < ATTEMPTS; i++) {
      const result = await refetchCompletion();
      if (result.data?.completed) return true;
      if (i < ATTEMPTS - 1) await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
    return false;
  }, [refetchCompletion]);

  const [pollError, setPollError] = useState<string | null>(null);

  const advanceOrSubmit = useCallback(async () => {
    if (isLastStep) {
      setPhase('submitting');
      setPollError(null);
      const success = await submit(draft.answers);
      if (success) {
        draft.clear();
        const found = await pollForCompletion();
        if (!found) {
          setPollError(
            "Tes réponses sont bien enregistrées on-chain, mais la prise en compte prend plus de temps que prévu. Réessaie dans quelques instants."
          );
        }
        setPhase('done');
      }
    } else {
      draft.setStepIndex(draft.currentStepIndex + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLastStep, submit, draft, pollForCompletion]);

  const handleRetry = useCallback(async () => {
    setPollError(null);
    const found = await pollForCompletion();
    if (!found) {
      setPollError(
        "Tes réponses sont bien enregistrées on-chain, mais la prise en compte prend plus de temps que prévu. Réessaie dans quelques instants."
      );
    }
  }, [pollForCompletion]);

  if (!isOpen || !walletAddress) return null;

  if (completionLoading) {
    return (
      <div className={styles.overlay}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <FaTimes style={{ width: 14, height: 14, flexShrink: 0 }} />
        </button>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className={styles.overlay}>
        <div className={styles.introContent}>
          <div className={styles.introBlock}>
            {/* TODO: swap in the real preferences-intro artwork once available (mirrors archetype-agent.png) */}
            <div className={styles.introImagePlaceholder} aria-hidden="true" />
            <p className={styles.introText}>
              Tell us how you like to play !
              <br />
              This will allow us to personalize your experience on the Player Map.
            </p>
          </div>
        </div>
        <div className={styles.navRow}>
          <button type="button" className={styles.prevBtn} onClick={onClose}>
            Later
          </button>
          <button
            type="button"
            className={styles.nextBtn}
            onClick={() => setPhase('steps')}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  if (completion?.completed) {
    const selectedTripleIds = new Set(completion.selectedTripleIds);
    return (
      <div className={styles.overlay}>
        <div className={styles.contentWrapper}>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <FaTimes style={{ width: 14, height: 14, flexShrink: 0 }} />
          </button>
        </div>
        <div className={styles.resultsWrapper}>
          <span className={styles.doneTitle}>Your preferences</span>
          {PREFERENCE_QUESTIONS.map(question => {
            const picked = question.options.filter(opt => selectedTripleIds.has(opt.tripleId));
            return (
              <div key={question.id} className={styles.resultsGroup}>
                <p className={styles.resultsGroupTitle}>{question.question}</p>
                <div className={styles.resultsTags}>
                  {picked.map(opt => (
                    <span key={opt.tripleId} className={styles.resultsTag}>{opt.label}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'submitting' || phase === 'done') {
    return (
      <div className={styles.overlay}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <FaTimes style={{ width: 14, height: 14, flexShrink: 0 }} />
        </button>
        <div className={styles.doneBlock}>
          {phase === 'submitting' && !submitError ? (
            <p className={styles.doneText}>Saving your preferences on-chain…</p>
          ) : submitError || pollError ? (
            <>
              <p className={styles.errorText}>{submitError ?? pollError}</p>
              <button type="button" className={styles.nextBtn} onClick={handleRetry}>
                Retry
              </button>
            </>
          ) : (
            <>
              <span className={styles.doneTitle}>All set!</span>
              <p className={styles.doneText}>
                Your preferences are saved. Head back to the missions panel to claim your reward.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!currentStep) return null;

  const selected = new Set(draft.answers[currentStep.id] ?? []);
  const answeredCount = steps.filter((_, i) => draft.isStepComplete(i)).length;

  return (
    <div className={styles.overlay}>
      <div className={styles.contentWrapper}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <FaTimes style={{ width: 14, height: 14, flexShrink: 0 }} />
        </button>

        <div className={styles.progressHeader}>
          <div className={styles.progressHeaderRow}>
            <span className={styles.progressHeaderLabel}>
              QUESTION <strong>{draft.currentStepIndex + 1}</strong> / {steps.length}
            </span>
            <span className={styles.progressHeaderCount}>{answeredCount} answered</span>
          </div>
          <div className={styles.progressHeaderTrack}>
            <div
              className={styles.progressHeaderFill}
              style={{ width: `${((draft.currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className={styles.stepContent}>
        <div className={styles.questionBlock}>
          <p className={styles.questionText}>{currentStep.question}</p>
          <CheckboxGroup
            options={currentStep.options}
            selected={selected}
            onToggle={(tripleId) => draft.toggleOption(currentStep.id, tripleId)}
          />
        </div>
      </div>

      <div className={styles.navRow}>
        <button
          type="button"
          className={styles.prevBtn}
          onClick={() =>
            draft.currentStepIndex === 0
              ? setPhase('intro')
              : draft.setStepIndex(draft.currentStepIndex - 1)
          }
        >
          ‹ Previous
        </button>

        <button
          type="button"
          className={styles.nextBtn}
          onClick={() => advanceOrSubmit()}
          disabled={!draft.isStepComplete(draft.currentStepIndex)}
        >
          {isLastStep ? 'Finish' : 'Next ›'}
        </button>
      </div>
    </div>
  );
};

export default PreferencesMission;

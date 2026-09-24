import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import archetypeAgentImg from '../../../assets/img/archetype-agent.png';
import IntensitySelector from './components/IntensitySelector';
import MultiRatingSelector from './components/MultiRatingSelector';
import ArchetypeBadge from './components/ArchetypeBadge';
import ArchetypeReveal from './components/ArchetypeReveal';
import { useArchetypeCompletion } from './hooks/useArchetypeCompletion';
import { useArchetypeDraft, AnswerValue, MultiRatingAnswer } from './hooks/useArchetypeDraft';
import { useArchetypeSubmission } from './hooks/useArchetypeSubmission';
import { usePlayerArchetype } from './hooks/usePlayerArchetype';
import { ArchetypeQuestion } from './archetype-questionnaire.config';
import styles from './ArchetypeMission.module.css';

interface ArchetypeMissionProps {
  isOpen: boolean;
  walletConnected?: any;
  walletAddress?: string;
  onClose: () => void;
  getAccessToken?: () => Promise<string | null>;
}

type FlowPhase = 'intro' | 'steps' | 'submitting' | 'reveal';

const ArchetypeMission: React.FC<ArchetypeMissionProps> = ({
  isOpen,
  walletConnected,
  walletAddress,
  onClose,
  getAccessToken,
}) => {
  const { completion, isLoading: completionLoading } = useArchetypeCompletion(walletAddress);

  const [phase, setPhase] = useState<FlowPhase>('steps');

  // Decide intro-vs-steps once per open (not once per mount — this
  // component stays mounted and toggles isOpen, so this must be
  // re-evaluated every time the mission is (re)launched). The intro always
  // reappears on relaunch as long as the mission isn't completed — waits
  // for completion to actually resolve (not just !completionLoading at the
  // moment isOpen flips) so a completed player isn't briefly shown the
  // intro before completion data arrives. Guarded against re-deciding while
  // already in 'submitting'/'reveal' so closing mid-reveal (e.g. to wait
  // out subgraph indexing lag) and reopening doesn't clobber that in-flight
  // state back to 'intro'/'steps'.
  const introDecidedForThisOpenRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      introDecidedForThisOpenRef.current = false;
      return;
    }
    if (introDecidedForThisOpenRef.current || !walletAddress || completionLoading) return;
    introDecidedForThisOpenRef.current = true;
    if (phase === 'submitting' || phase === 'reveal') return;
    setPhase(completion?.completed ? 'steps' : 'intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, walletAddress, completionLoading, completion?.completed]);

  // Partial completion (some questions voted on-chain, but not all) — only
  // re-prompt the still-missing question(s) instead of the full 15.
  const missingTripleIds =
    completion && !completion.completed && completion.votedCount > 0
      ? completion.missingTripleIds
      : undefined;
  const isFixingMissing = !!missingTripleIds && missingTripleIds.length > 0;

  const draft = useArchetypeDraft(walletAddress, missingTripleIds);
  const { submit, isSubmitting, error: submitError } = useArchetypeSubmission({
    walletConnected,
    walletAddress,
  });
  const { archetype, refetch: refetchArchetype } = usePlayerArchetype(walletAddress);
  // Set only when the on-chain deposits succeeded but the subgraph still
  // hasn't indexed them after polling — distinct from submitError (an
  // actual tx failure), so its retry just re-polls instead of restarting
  // the whole questionnaire.
  const [revealError, setRevealError] = useState<string | null>(null);

  const steps = draft.steps;
  const currentStep = steps[draft.currentStepIndex];
  const isLastStep = draft.currentStepIndex === steps.length - 1;

  // computeArchetype requires every triple to be indexed by the subgraph
  // (completed === votedCount === total) — right after the depositBatch tx
  // confirms, the subgraph is usually a few seconds behind, so a single
  // refetch right after submit reliably comes back empty. Poll instead.
  const pollForArchetype = useCallback(async (): Promise<boolean> => {
    const ATTEMPTS = 8;
    const DELAY_MS = 2500;
    for (let i = 0; i < ATTEMPTS; i++) {
      const result = await refetchArchetype();
      if (result.data) return true;
      if (i < ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
    return false;
  }, [refetchArchetype]);

  // answersOverride lets the auto-advance path (below) pass the
  // just-clicked answer directly — draft.setAnswer's state update hasn't
  // propagated yet when the delayed advanceOrSubmit() call fires, so
  // reading draft.answers here would silently drop that last answer.
  const advanceOrSubmit = useCallback(async (answersOverride?: typeof draft.answers) => {
    if (isLastStep) {
      setPhase('submitting');
      setRevealError(null);
      const success = await submit(answersOverride ?? draft.answers);
      if (success) {
        draft.clear();
        const found = await pollForArchetype();
        if (!found) {
          setRevealError(
            "Your votes are recorded on-chain, but the analysis is taking longer than expected. Try again in a moment."
          );
        }
        setPhase('reveal');
      }
      // en cas d'échec on reste en 'submitting' : ArchetypeReveal affiche l'erreur + retry
    } else {
      draft.setStepIndex(draft.currentStepIndex + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLastStep, submit, draft, pollForArchetype]);

  const handleAutoAdvanceAnswer = useCallback((question: ArchetypeQuestion, value: AnswerValue) => {
    const nextAnswers = { ...draft.answers, [question.id]: value };
    draft.setAnswer(question.id, value);
    setTimeout(() => {
      advanceOrSubmit(nextAnswers);
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, advanceOrSubmit]);

  const handleRetry = useCallback(async () => {
    if (revealError) {
      setRevealError(null);
      const found = await pollForArchetype();
      if (!found) {
        setRevealError(
          "Your votes are recorded on-chain, but the analysis is taking longer than expected. Try again in a moment."
        );
      }
      return;
    }
    setPhase('steps');
  }, [revealError, pollForArchetype]);

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
            <img src={archetypeAgentImg} alt="" className={styles.introImage} />
            <p className={styles.introText}>
              Before you dive into the adventure, we've got one question for you: what kind of
              player are you, really? This quick questionnaire helps us understand your style —
              collector, competitor, or just here to unwind. Takes 2 minutes, and it kicks off your
              player profile on Player Map.
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
    return (
      <div className={styles.overlay}>
        <ArchetypeBadge address={walletAddress} onClose={onClose} getAccessToken={getAccessToken} />
      </div>
    );
  }

  if (phase === 'submitting' || phase === 'reveal') {
    return (
      <div className={styles.overlay}>
        <ArchetypeReveal
          isSubmitting={phase === 'submitting' && isSubmitting}
          archetype={phase === 'reveal' ? archetype : null}
          submitError={submitError ?? revealError}
          onRetry={handleRetry}
          onClose={onClose}
        />
      </div>
    );
  }

  if (!currentStep) return null;

  const isSingleQuestionStep = currentStep.questions.length === 1;
  const singleQuestion = currentStep.questions[0];
  // Auto-advance uniquement pour une step à 1 question intensity_for_against
  // (un seul choix binaire, sans ambiguïté). Une step multi_rating à 1 question
  // peut porter plusieurs options — on garde le bouton "Next" pour laisser
  // le temps de toutes les évaluer.
  const isAutoAdvanceStep = isSingleQuestionStep && singleQuestion.type === 'intensity_for_against';
  const tableQuestionType = !isSingleQuestionStep ? currentStep.questions[0].type : null;

  const getMultiRatingAnswer = (questionId: string): MultiRatingAnswer =>
    (draft.answers[questionId] as MultiRatingAnswer | undefined) ?? {};

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
        {isFixingMissing && (
          <p className={styles.missingAnswerNotice}>
            <FaExclamationTriangle className={styles.missingAnswerIcon} />
            One of your answers wasn't recorded — please answer again.
          </p>
        )}
        {currentStep.title && <h2 className={styles.stepTitle}>{currentStep.title}</h2>}

        {isSingleQuestionStep ? (
          singleQuestion.type === 'intensity_for_against' ? (
            <div className={styles.standaloneQuestion}>
              <p className={styles.questionText}>{singleQuestion.question}</p>
              <IntensitySelector
                value={draft.answers[singleQuestion.id] as AnswerValue | undefined}
                onChange={(value) => handleAutoAdvanceAnswer(singleQuestion, value)}
              />
            </div>
          ) : (
            <div className={styles.standaloneQuestion}>
              <p className={styles.questionText}>{singleQuestion.question}</p>
              <div className={styles.optionsList}>
                {singleQuestion.options.map(option => {
                  const current = getMultiRatingAnswer(singleQuestion.id);
                  return (
                    <div key={option.tripleId} className={styles.optionRow}>
                      <span className={styles.optionLabel}>{option.label}</span>
                      <MultiRatingSelector
                        value={current[option.tripleId]}
                        onChange={(value) =>
                          draft.setAnswer(singleQuestion.id, { ...current, [option.tripleId]: value })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span className={styles.tableHeaderSpacer} />
              {(tableQuestionType === 'intensity_for_against'
                ? ['👎👎', '👎', '👍', '👍👍']
                : ['👎', '—', '👍', '👍👍']
              ).map((icon, i) => (
                <span key={i} className={styles.tableHeaderIcon} aria-hidden="true">
                  {icon}
                </span>
              ))}
            </div>

            {tableQuestionType === 'intensity_for_against'
              ? currentStep.questions.map(question => {
                  if (question.type !== 'intensity_for_against') return null;
                  return (
                    <div key={question.id} className={styles.tableRow}>
                      <span className={styles.tableRowLabel}>{question.question}</span>
                      <IntensitySelector
                        compact
                        value={draft.answers[question.id] as AnswerValue | undefined}
                        onChange={(value) => draft.setAnswer(question.id, value)}
                      />
                    </div>
                  );
                })
              : currentStep.questions.map(question => {
                  if (question.type !== 'multi_rating') return null;
                  const current = getMultiRatingAnswer(question.id);
                  return question.options.map(option => (
                    <div key={option.tripleId} className={styles.tableRow}>
                      <span className={styles.tableRowLabel}>{option.label}</span>
                      <MultiRatingSelector
                        compact
                        value={current[option.tripleId]}
                        onChange={(value) =>
                          draft.setAnswer(question.id, { ...current, [option.tripleId]: value })
                        }
                      />
                    </div>
                  ));
                })}
          </div>
        )}
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

        {(!isAutoAdvanceStep || draft.isStepComplete(draft.currentStepIndex)) && (
          <button
            type="button"
            className={styles.nextBtn}
            onClick={() => advanceOrSubmit()}
            disabled={!draft.isStepComplete(draft.currentStepIndex)}
          >
            {isLastStep ? 'Finish' : 'Next ›'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ArchetypeMission;

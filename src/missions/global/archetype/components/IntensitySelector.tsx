import React from 'react';
import styles from './IntensitySelector.module.css';
import { AnswerCurve, AnswerIntensity, AnswerValue } from '../hooks/useArchetypeDraft';
import upSvg from '../../../../assets/img/up.svg';
import downSvg from '../../../../assets/img/down.svg';

interface IntensitySelectorProps {
  value: AnswerValue | null | undefined;
  onChange: (value: AnswerValue) => void;
  compact?: boolean;
  // Reused as-is by the Feedback/Campaign vote UI (ClaimItem) — disables a
  // whole curve (both intensities) when the wallet already holds an
  // on-chain position in that direction, same semantics as the old
  // up/down-button disable there. Optional, unused by the archetype quiz.
  isOptionDisabled?: (curve: AnswerCurve, intensity: AnswerIntensity) => boolean;
}

// Intensity is conveyed by icon count (strong = 2, weak = 1), direction by up vs down.
const OPTIONS: Array<{ curve: AnswerCurve; intensity: AnswerIntensity; icon: string; iconCount: number; label: string }> = [
  { curve: 'against', intensity: 'fort', icon: downSvg, iconCount: 2, label: 'Strongly disagree' },
  { curve: 'against', intensity: 'faible', icon: downSvg, iconCount: 1, label: 'Disagree' },
  { curve: 'for', intensity: 'faible', icon: upSvg, iconCount: 1, label: 'Agree' },
  { curve: 'for', intensity: 'fort', icon: upSvg, iconCount: 2, label: 'Strongly agree' },
];

const IntensitySelector: React.FC<IntensitySelectorProps> = ({ value, onChange, compact = false, isOptionDisabled }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next = (index + delta + OPTIONS.length) % OPTIONS.length;
      const group = e.currentTarget.parentElement;
      (group?.children[next] as HTMLElement | undefined)?.focus();
    }
  };

  return (
    <div className={[styles.group, compact ? styles.groupCompact : ''].join(' ')} role="radiogroup">
      {OPTIONS.map((opt, i) => {
        const isSelected = value?.curve === opt.curve && value?.intensity === opt.intensity;
        const disabled = isOptionDisabled?.(opt.curve, opt.intensity) ?? false;
        return (
          <button
            key={`${opt.curve}-${opt.intensity}`}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            className={[styles.btn, isSelected ? styles.btnSelected : ''].join(' ')}
            onClick={disabled ? undefined : () => onChange({ curve: opt.curve, intensity: opt.intensity })}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            <div className={styles.iconGroup}>
              {Array.from({ length: opt.iconCount }).map((_, iconIndex) => (
                <img key={iconIndex} src={opt.icon} alt="" aria-hidden="true" className={styles.icon} />
              ))}
            </div>
            <span className={compact ? styles.srOnly : styles.label}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default IntensitySelector;

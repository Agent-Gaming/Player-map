import React from 'react';
import TruncatedText from './TruncatedText';
import styles from './AtomBubble.module.css';

interface AtomBubbleProps {
  label: string;
  fontSize?: string;
  maxLength?: number;
}

const AtomBubble: React.FC<AtomBubbleProps> = ({ label, fontSize = '13px', maxLength = 15 }) => {
  return (
    <div className={styles.bubble} style={{ fontSize }}>
      <div className={styles.dot} />
      <TruncatedText text={label} maxLength={maxLength} />
    </div>
  );
};

export default AtomBubble;


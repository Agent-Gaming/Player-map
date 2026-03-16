import React from 'react';
import TruncatedText from './TruncatedText';
import styles from './Positions.module.css';

interface TripleBubbleProps {
  subject: string;
  predicate: string;
  object: string;
  fontSize?: string;
  showArrows?: boolean;
  maxLength?: number;
}

const TripleBubble: React.FC<TripleBubbleProps> = ({ 
  subject, 
  predicate, 
  object, 
  fontSize = '13px',
  showArrows = true,
}) => {
  return (
    <div className={styles.tripleRow}>
      {/* Sujet - seulement si non vide */}
      {subject && (
        <>
          <div className={styles.tripleBubble} style={{ fontSize }}>
            <div className={styles.tripleDot} style={{ backgroundColor: '#FF9500' }} />
            <TruncatedText text={subject} maxLength={10} className={styles.tripleBubbleText} />
          </div>
          
          {showArrows && (
            <div className={styles.tripleArrow}>→</div>
          )}
        </>
      )}
      
      {/* Prédicat */}
      <div className={styles.tripleBubble} style={{ fontSize }}>
        <div className={styles.tripleDot} style={{ backgroundColor: '#006FE8' }} />
        <TruncatedText text={predicate} maxLength={8} className={styles.tripleBubbleText} />
      </div>
      
      {showArrows && (
        <div className={styles.tripleArrow}>→</div>
      )}
      
      {/* Objet */}
      <div className={styles.tripleBubble} style={{ fontSize }}>
        <div className={styles.tripleDot} style={{ backgroundColor: '#4CAF50' }} />
        <TruncatedText text={object} maxLength={12} className={styles.tripleBubbleText} />
      </div>
    </div>
  );
};

export default TripleBubble;

import React from 'react';
import styles from './Positions.module.css';
import upSvg from '../../assets/img/up.svg';
import downSvg from '../../assets/img/down.svg';
import upNotSelectedSvg from '../../assets/img/upNotSelected.svg';
import downNotSelectedSvg from '../../assets/img/downNotSelected.svg';

interface PositionBubbleProps {
  isFor: boolean;
  count?: number;
  fontSize?: string;
  showCount?: boolean;
}

const PositionBubble: React.FC<PositionBubbleProps> = ({ 
  isFor, 
  count, 
  fontSize = '14px',
  showCount = false 
}) => {
  const hasCount = count !== undefined && count > 0;
  const icon = isFor
    ? (hasCount ? upSvg : upNotSelectedSvg)
    : (hasCount ? downSvg : downNotSelectedSvg);

  return (
    <div className={styles.bubble}>
      <img
        src={icon}
        alt={isFor ? 'up' : 'down'}
        className={styles.bubbleIcon}
      />
      <span
        className={styles.bubbleLabel}
        style={{ fontSize, color: isFor ? '#006FE8' : '#FF9500' }}
      >
        {showCount && count !== undefined ? count : (isFor ? 'For' : 'Against')}
      </span>
    </div>
  );
};

export default PositionBubble;


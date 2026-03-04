import React from 'react';
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
  fontSize = '12px',
  showCount = false 
}) => {
  const hasCount = count !== undefined && count > 0;
  const icon = isFor
    ? (hasCount ? upSvg : upNotSelectedSvg)
    : (hasCount ? downSvg : downNotSelectedSvg);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '6px',
    }}>
      <img
        src={icon}
        alt={isFor ? 'up' : 'down'}
        style={{ width: 14, height: 14, display: 'block', flexShrink: 0 }}
      />
      <span style={{ 
        fontSize, 
        color: isFor ? '#006FE8' : '#FF9500', 
        fontWeight: '600' 
      }}>
        {showCount && count !== undefined ? count : (isFor ? 'For' : 'Against')}
      </span>
    </div>
  );
};

export default PositionBubble;


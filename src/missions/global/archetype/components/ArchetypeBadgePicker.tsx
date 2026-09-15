import React from 'react';
import { useArchetypeBadges } from '../hooks/useArchetypeBadges';
import SafeImage from '../../../../components/SafeImage';
import styles from './ArchetypeBadgePicker.module.css';

interface ArchetypeBadgePickerProps {
  address: string;
  getAccessToken?: () => Promise<string | null>;
}

const ArchetypeBadgePicker: React.FC<ArchetypeBadgePickerProps> = ({ address, getAccessToken }) => {
  const { items, equippedItemId, isLoading, equip, isEquipping, equipError } = useArchetypeBadges({
    address,
    getAccessToken,
  });

  // No badges unlocked yet for this archetype — nothing to render, no
  // "empty state" clutter under the reveal card.
  if (isLoading || items.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <p className={styles.title}>Choisis ton badge</p>
      <div className={styles.grid}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === equippedItemId ? styles.optionSelected : styles.option}
            onClick={() => equip(item.id)}
            disabled={isEquipping}
          >
            <SafeImage src={item.image_url} alt={item.name} className={styles.image} />
            <span className={styles.name}>{item.name}</span>
          </button>
        ))}
      </div>
      {equipError && <p className={styles.error}>{equipError.message}</p>}
    </div>
  );
};

export default ArchetypeBadgePicker;

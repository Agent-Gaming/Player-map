import React, { useState } from 'react';
import SafeImage from '../../../../components/SafeImage';
import { useLibrary } from '../useLibrary';
import { useUpdateLoadout } from '../useUpdateLoadout';
import type { CosmeticItem } from '../cosmeticsLoadoutApi';
import styles from './CosmeticsLibraryModal.module.css';

interface SectionProps {
  title: string;
  items: CosmeticItem[];
  selectedId: string | null;
  onSelect: (item: CosmeticItem | null) => void;
  reducedMotion: boolean;
  noneLabel: string;
}

const Section: React.FC<SectionProps> = ({ title, items, selectedId, onSelect, reducedMotion, noneLabel }) => (
  <div className={styles.section}>
    {items.length === 0 ? (
      <p className={styles.emptyState}>You don't own any {title.toLowerCase()} yet.</p>
    ) : (
      <div className={styles.grid}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={selectedId === item.id ? styles.optionSelected : styles.option}
            onClick={() => onSelect(item)}
          >
            {/* Static previews under reduced-motion, same as the live profile. */}
            <SafeImage
              src={reducedMotion ? item.src_static : item.src}
              alt={item.name}
              className={styles.image}
            />
            <span className={styles.name}>{item.name}</span>
          </button>
        ))}
      </div>
    )}
    <button type="button" className={selectedId === null ? styles.optionSelected : styles.option} onClick={() => onSelect(null)}>
      <span className={styles.noneLabel}>{noneLabel}</span>
    </button>
  </div>
);

interface CosmeticsLibraryModalProps {
  isOpen: boolean;
  address?: string;
  getAccessToken?: () => Promise<string | null>;
  draftBanner: CosmeticItem | null;
  draftDecoration: CosmeticItem | null;
  onSelectBanner: (item: CosmeticItem | null) => void;
  onSelectDecoration: (item: CosmeticItem | null) => void;
  currentBannerId: string | null;
  currentDecorationId: string | null;
  reducedMotion: boolean;
  onClose: () => void;
}

// Own-profile-only (see RightPanel.tsx — never rendered from
// OtherPlayerProfileContent). Selections here drive a live preview on the
// caller's own AtomDetailsSection via draftBanner/draftDecoration; this
// modal only commits them (PUT) on Confirm. Cancel/close never touches the
// server — the caller just stops showing the draft and falls back to the
// real, unchanged loadout.
export const CosmeticsLibraryModal: React.FC<CosmeticsLibraryModalProps> = ({
  isOpen,
  address,
  getAccessToken,
  draftBanner,
  draftDecoration,
  onSelectBanner,
  onSelectDecoration,
  currentBannerId,
  currentDecorationId,
  reducedMotion,
  onClose,
}) => {
  const { items, isLoading } = useLibrary({ address, getAccessToken });
  const { updateLoadout, isUpdating, reset } = useUpdateLoadout({ address, getAccessToken });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'banner' | 'avatar_decoration'>('banner');

  if (!isOpen) return null;

  const banners = items.filter((i) => i.slot === 'banner');
  const decorations = items.filter((i) => i.slot === 'avatar_decoration');

  const handleCancel = () => {
    reset();
    setSaveError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setSaveError(null);
    try {
      const updates: Promise<unknown>[] = [];
      if ((draftBanner?.id ?? null) !== currentBannerId) {
        updates.push(updateLoadout({ slot: 'banner', itemId: draftBanner?.id ?? null }));
      }
      if ((draftDecoration?.id ?? null) !== currentDecorationId) {
        updates.push(updateLoadout({ slot: 'avatar_decoration', itemId: draftDecoration?.id ?? null }));
      }
      if (updates.length === 0) {
        onClose();
        return;
      }
      await Promise.all(updates);
      onClose();
    } catch (err) {
      // Previous (real, server-side) selection is untouched — nothing
      // partially committed, draft stays as-is so the user can just retry.
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    }
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Customize profile</h2>
        <div className={styles.tabs}>
          <button
            type="button"
            className={activeTab === 'banner' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('banner')}
          >
            Banners
          </button>
          <button
            type="button"
            className={activeTab === 'avatar_decoration' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('avatar_decoration')}
          >
            Decorations
          </button>
        </div>
        {isLoading ? (
          <p className={styles.loading}>Loading your items…</p>
        ) : activeTab === 'banner' ? (
          <Section
            title="Banners"
            items={banners}
            selectedId={draftBanner?.id ?? null}
            onSelect={onSelectBanner}
            reducedMotion={reducedMotion}
            noneLabel="None (default banner)"
          />
        ) : (
          <Section
            title="Decorations"
            items={decorations}
            selectedId={draftDecoration?.id ?? null}
            onSelect={onSelectDecoration}
            reducedMotion={reducedMotion}
            noneLabel="None"
          />
        )}
        {saveError && <p className={styles.error}>{saveError}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={handleCancel} disabled={isUpdating}>
            Cancel
          </button>
          <button type="button" className={styles.confirmBtn} onClick={handleConfirm} disabled={isUpdating}>
            {isUpdating ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

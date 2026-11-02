import React, { useState } from 'react';
import type { CosmeticItem } from '../cosmeticsLoadoutApi';

interface DecorationOverlayProps {
  decoration?: CosmeticItem | null;
  reducedMotion: boolean;
  className: string;
}

// Hidden entirely on load failure (never a broken-image icon) — unlike
// SafeImage, which always shows a visible placeholder box on failure.
const DecorationOverlayImpl: React.FC<DecorationOverlayProps> = ({ decoration, reducedMotion, className }) => {
  const [failed, setFailed] = useState(false);
  if (!decoration || failed) return null;
  const src = reducedMotion ? decoration.src_static : decoration.src;
  return <img src={src} alt={decoration.name} className={className} onError={() => setFailed(true)} />;
};

// Keyed on the decoration id so switching/clearing the equipped decoration
// remounts this (resetting the internal `failed` state) instead of getting
// stuck hidden after a prior item's load failure.
export const DecorationOverlay: React.FC<DecorationOverlayProps> = (props) => (
  <DecorationOverlayImpl key={props.decoration?.id ?? 'none'} {...props} />
);

import React, { useState, useEffect, CSSProperties } from 'react';
import { ipfsToHttpUrl, extractIpfsHash, PUBLIC_FALLBACK_GATEWAY } from '../utils/pinata';
import styles from './SafeImage.module.css';

const normalizeSrc = (src?: string) => src ? ipfsToHttpUrl(src) : src;

interface SafeImageProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  fallbackSrc?: string;
  fallbackSources?: string[]; // Nouveau: liste de fallbacks à essayer
  showPlaceholder?: boolean;
  placeholderText?: string;
  placeholderElement?: React.ReactNode;
}

/**
 * Composant image avec gestion automatique des erreurs de chargement
 * - Affiche une image de fallback en cas d'erreur CORS ou 404
 * - Supporte les URLs IPFS et HTTP
 * - Gère les placeholder pour les images manquantes
 */
const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = 'Image',
  className,
  style,
  fallbackSrc,
  fallbackSources = [],
  showPlaceholder = true,
  placeholderText = '?',
  placeholderElement,
}) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(normalizeSrc(src));
  const [hasError, setHasError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(-1);
  const [triedPublicGateway, setTriedPublicGateway] = useState(false);

  // Réinitialiser quand src change (changement d'atom)
  useEffect(() => {
    setImgSrc(normalizeSrc(src));
    setHasError(false);
    setFallbackIndex(-1);
    setTriedPublicGateway(false);
  }, [src]);

  // Gérer les erreurs de chargement (CORS, 404, etc.)
  const handleError = () => {
    if (!hasError) {
      setHasError(true);

      // Essayer l'image de fallback si fournie
      if (fallbackSrc && imgSrc !== fallbackSrc) {
        setImgSrc(fallbackSrc);
        return;
      }

      // Essayer les fallbacks dans fallbackSources
      const nextIndex = fallbackIndex + 1;
      if (fallbackSources && nextIndex < fallbackSources.length) {
        console.log(`Trying fallback ${nextIndex + 1}/${fallbackSources.length}:`, fallbackSources[nextIndex]);
        setFallbackIndex(nextIndex);
        setImgSrc(fallbackSources[nextIndex]);
        setHasError(false); // Réinitialiser pour réessayer
        return;
      }

      // Dernier recours avant le placeholder : si la source vient d'IPFS et
      // était servie par un gateway dédié (configuré par le host via
      // setPinataConstants), ce gateway ne sert que le contenu pinné sur SON
      // compte — un CID pinné ailleurs y répond 404/ERR_ID:00006 alors qu'il
      // est parfaitement accessible via le gateway public.
      const hash = extractIpfsHash(src);
      const publicUrl = hash ? ipfsToHttpUrl(src!, PUBLIC_FALLBACK_GATEWAY) : null;
      if (publicUrl && imgSrc !== publicUrl && !triedPublicGateway) {
        setTriedPublicGateway(true);
        setImgSrc(publicUrl);
        setHasError(false);
        return;
      }

      // Si tous les fallbacks ont échoué, afficher le placeholder
      if (showPlaceholder) {
        setImgSrc(undefined);
      }
    }
  };

  // Si pas d'image ou erreur et showPlaceholder
  if (!imgSrc || (hasError && showPlaceholder && !fallbackSrc)) {
    return (
      <div
        className={[styles.placeholder, className].filter(Boolean).join(' ')}
        style={{
          ...style,
          fontSize: style?.width ? `${parseInt(String(style.width)) / 3}px` : '24px',
        }}
        title={alt}
      >
        {placeholderElement ?? placeholderText}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      loading="lazy"
    />
  );
};

export default SafeImage;

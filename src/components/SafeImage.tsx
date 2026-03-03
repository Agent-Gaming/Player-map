import React, { useState, useEffect, CSSProperties } from 'react';

interface SafeImageProps {
  src?: string;
  alt?: string;
  style?: CSSProperties;
  fallbackSrc?: string;
  fallbackSources?: string[]; // Nouveau: liste de fallbacks à essayer
  showPlaceholder?: boolean;
  placeholderText?: string;
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
  style,
  fallbackSrc,
  fallbackSources = [],
  showPlaceholder = true,
  placeholderText = '?'
}) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [hasError, setHasError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(-1);

  // Réinitialiser quand src change (changement d'atom)
  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
    setFallbackIndex(-1);
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
        style={{
          ...style,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 211, 42, 0.2)',
          color: '#FFD32A',
          fontWeight: 'bold',
          fontSize: style?.width ? `${parseInt(String(style.width)) / 3}px` : '24px',
        }}
        title={alt}
      >
        {placeholderText}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      style={style}
      onError={handleError}
      loading="lazy"
    />
  );
};

export default SafeImage;

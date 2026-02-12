/**
 * Utilitaires pour gérer les URLs IPFS dans l'application
 */

import { ipfsToHttpUrl, isIpfsUrl, uploadToPinata } from './pinata';
import { getPinataConstants } from './globalConstants';

/**
 * Upload et hash des données JSON vers IPFS
 */
export const hashDataToIPFS = async (data: any) => {
  try {
    // Récupérer les constantes Pinata
    const constants = getPinataConstants();
    if (!constants?.PINATA_CONFIG?.JWT_KEY || !constants?.PINATA_CONFIG?.IPFS_GATEWAY) {
      throw new Error("Configuration Pinata manquante. Appelez setPinataConstants() avec PINATA_CONFIG");
    }

    // Créer un fichier JSON à partir des données
    const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const jsonFile = new File([jsonBlob], 'data.json', { type: 'application/json' });

    // Uploader le JSON vers Pinata
    const ipfsUrl = await uploadToPinata(jsonFile);
    const hash = ipfsUrl.replace('ipfs://', '');
    const PINATA_GATEWAY = constants.PINATA_CONFIG.IPFS_GATEWAY;

    return {
      ipfsHash: `ipfs://${hash}`,
      httpUrl: `https://${PINATA_GATEWAY}/ipfs/${hash}`
    }
  } catch (error) {
    console.error('Erreur lors du hachage de données vers IPFS:', error)
    throw error;
  }
};

/**
 * Convertit récursivement toutes les URLs IPFS dans un objet en URLs HTTP
 * Utilisé principalement pour les données du graphique
 */
export const convertIpfsUrlsInObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Cas spécial: si c'est une string qui est une URL IPFS
  if (typeof obj === 'string' && isIpfsUrl(obj)) {
    return ipfsToHttpUrl(obj);
  }

  // Si c'est un tableau, traiter chaque élément
  if (Array.isArray(obj)) {
    return obj.map(item => convertIpfsUrlsInObject(item));
  }

  // Si c'est un objet, traiter chaque propriété
  const converted: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      // Conversion spéciale pour les propriétés "image"
      if (key === 'image' && typeof value === 'string' && isIpfsUrl(value)) {
        converted[key] = ipfsToHttpUrl(value);
      } else if (typeof value === 'object' && value !== null) {
        converted[key] = convertIpfsUrlsInObject(value);
      } else {
        converted[key] = value;
      }
    }
  }

  return converted;
};

/**
 * Convertit toutes les URLs IPFS dans les données du graphique
 * Applique la conversion aux nodes et links
 */
export const convertGraphDataIpfsUrls = (graphData: any): any => {
  if (!graphData) {
    return graphData;
  }

  return {
    nodes: convertIpfsUrlsInObject(graphData.nodes || []),
    links: convertIpfsUrlsInObject(graphData.links || []),
  };
};

/**
 * Convertit une URL IPFS unique en URL HTTP
 * Retourne l'URL inchangée si ce n'est pas une URL IPFS
 */
export const ensureHttpUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;
  if (isIpfsUrl(url)) {
    return ipfsToHttpUrl(url);
  }
  return url;
};

/**
 * Précharge une image via une gateway IPFS pour l'optimisation
 */
export const preloadIpfsImage = (ipfsUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const httpUrl = ipfsToHttpUrl(ipfsUrl);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(httpUrl);
    img.onerror = () => reject(new Error(`Failed to load image: ${httpUrl}`));
    img.src = httpUrl;
  });
};

// Ré-exporter les fonctions de pinata pour faciliter les imports
export { isIpfsUrl, ipfsToHttpUrl, uploadToPinata } from './pinata';

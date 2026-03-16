import React from "react";
import { useEffect, useState } from "react";
import { fetchAtomDetails, type AtomDetails } from "../../api/fetchAtomDetails";
import { ipfsToHttpUrl, isIpfsUrl } from "../../utils/pinata";
import SafeImage from "../SafeImage";
import { getAtomVerificationStatus } from "../../config/verifiedAtoms";
import verifiedIcon from "../../assets/img/verified.svg";
import communityIcon from "../../assets/img/community.svg";
import styles from "./AtomDetailsSection.module.css";

interface AtomDetailsSectionProps {
  atomDetails: any;
  connections: {
    follows: any[];
    followers: any[];
  };
  walletAddress?: string;
  showDescription?: boolean;
}

const AtomDetailsSection: React.FC<AtomDetailsSectionProps> = ({
  atomDetails,
  connections,
  walletAddress,
  showDescription = true,
}) => {
  const [ipfsMetadata, setIpfsMetadata] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  if (!atomDetails) return null;

  // Fetch IPFS metadata si data est une URL IPFS
  useEffect(() => {
    const fetchIpfsData = async () => {
      if (atomDetails.data && (atomDetails.data.startsWith('ipfs://') || atomDetails.data.startsWith('http'))) {
        try {
          console.log("Fetching IPFS metadata from:", atomDetails.data);
          
          // Liste de gateways IPFS à essayer en cas d'échec
          const gateways = [
            ipfsToHttpUrl(atomDetails.data), // Gateway configurée (Pinata)
            `https://ipfs.io/ipfs/${atomDetails.data.replace('ipfs://', '')}`, // Gateway publique IPFS
            `https://cloudflare-ipfs.com/ipfs/${atomDetails.data.replace('ipfs://', '')}`, // Cloudflare
          ];
          
          let metadata = null;
          let lastError = null;
          
          // Essayer chaque gateway jusqu'à ce qu'une fonctionne
          for (const url of gateways) {
            try {
              console.log("Trying gateway:", url);
              const response = await fetch(url);
              if (response.ok) {
                metadata = await response.json();
                console.log("IPFS metadata loaded from:", url, metadata);
                setIpfsMetadata(metadata);
                return;
              } else {
                console.warn(`Gateway returned status ${response.status}:`, url);
              }
            } catch (error) {
              console.warn("Gateway failed:", url, error);
              lastError = error;
            }
          }
          
          // Si toutes les gateways ont échoué
          if (!metadata) {
            console.error("All IPFS gateways failed. Last error:", lastError);
          }
        } catch (error) {
          console.error("Error fetching IPFS metadata:", error);
        }
      }
    };

    fetchIpfsData();
  }, [atomDetails.data]);


  // Extraire la description depuis plusieurs sources possibles
  let description = "No description available";
  
  // 1. Essayer d'abord depuis value (GraphQL)
  if (atomDetails.value?.thing?.description) {
    description = atomDetails.value.thing.description;
  } else if (atomDetails.value?.person?.description) {
    description = atomDetails.value.person.description;
  } else if (atomDetails.value?.organization?.description) {
    description = atomDetails.value.organization.description;
  } else if (atomDetails.value?.book?.description) {
    description = atomDetails.value.book.description;
  } 
  // 2. Essayer depuis IPFS metadata
  else if (ipfsMetadata?.description) {
    description = ipfsMetadata.description;
  }
  // 3. Essayer depuis data (JSON string)
  else if (atomDetails.data) {
    try {
      // Vérifier que ce n'est pas une URL IPFS ou HTTP avant de parser
      if (!atomDetails.data.startsWith('ipfs://') && !atomDetails.data.startsWith('http://') && !atomDetails.data.startsWith('https://')) {
        const parsedData = JSON.parse(atomDetails.data);
        if (parsedData.description) {
          description = parsedData.description;
        }
      }
    } catch (e) {
      console.error("Error parsing atomDetails.data:", e);
    }
  }
  // 4. Fallback direct
  else if (atomDetails.description) {
    description = atomDetails.description;
  }

  console.log("Final description:", description);

  // Préparer l'URL d'image (support IPFS + metadata IPFS)
  const rawImageUrl = ipfsMetadata?.image || atomDetails.image;
  
  // Si l'image est une URL IPFS, créer plusieurs fallbacks avec différentes gateways
  let imageUrl: string | undefined;
  let imageFallbacks: string[] = [];
  
  if (rawImageUrl) {
    if (isIpfsUrl(rawImageUrl)) {
      const hash = rawImageUrl.replace('ipfs://', '');
      // Utiliser directement les gateways publiques IPFS (pas de 403)
      const allGateways = [
        `https://ipfs.io/ipfs/${hash}`, // Gateway publique officielle en premier
        `https://cloudflare-ipfs.com/ipfs/${hash}`, // Cloudflare en backup
        `https://gateway.pinata.cloud/ipfs/${hash}`, // Gateway publique Pinata
      ];
      imageUrl = allGateways[0]; // Première URL à essayer
      imageFallbacks = allGateways.slice(1); // Les autres comme fallbacks
    } else {
      imageUrl = rawImageUrl;
    }
  }

  // Extraire la description selon le type d'atom
  const getDescription = () => {
    if (!atomDetails.value) return "No description available";
    
    const value = atomDetails.value;
    return (
      value.person?.description ||
      value.organization?.description ||
      value.thing?.description ||
      value.book?.description ||
      value.name || // Fallback sur le nom
      "No description available"
    );
  };

  return (
    <>
      {/* Atom header */}
      <div className={styles.header}>
        {/* Vérification de l'atome */}
        {(() => {
          const verification = getAtomVerificationStatus(atomDetails.term_id);
          
          return (
            <div className={styles.headerContent}>
              {verification.status === "verified" ? (
                // ─── ATOME VÉRIFIÉ ─────────────────────────────────────
                <div className={styles.rowFlex}>
                  {/* Image à gauche */}
                  <div className={styles.imageContainer}>
                    <SafeImage
                      src={imageUrl as string}
                      fallbackSources={imageFallbacks}
                      alt={atomDetails.label || "Atom image"}
                      style={{width: "100%", height: "100%", objectFit: "cover", borderRadius: "16px", display: "block" }}
                      placeholderText={atomDetails.emoji || "?"}
                      showPlaceholder={true}
                    />
                  </div>
                  
                  {/* Colonne droite: nom + badge + description */}
                  <div className={styles.rightColumn}>
                    <div className={styles.nameRow}>
                      <p className={styles.atomName}>
                        <strong>{String(atomDetails.label ?? "Not defined")}</strong>
                      </p>
                      
                      {/* Badge verified avec tooltip */}
                      <div 
                        className={styles.badgeWrapper}
                        onMouseEnter={() => setShowTooltip('verified')}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <img 
                          src={verifiedIcon} 
                          alt="Verified" 
                          className={styles.badgeIcon}
                        />
                        {showTooltip === 'verified' && (
                          <div className={styles.tooltip}>
                            Verified by {verification.studio}
                            <div className={styles.tooltipArrow} />
                          </div>
                        )}
                      </div>
                    </div>
                    {showDescription && (
                      <div className={styles.descriptionScroll}>
                        <p className={styles.descriptionText}>{description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : verification.status === "not-verified" ? (
                // ─── ATOME NON VÉRIFIÉ ─────────────────────────────────
                <div className={styles.rowFlex}>
                  {/* Nom + badge + description (sans image) */}
                  <div className={styles.rightColumn}>
                    <div className={styles.nameRow}>
                      <p className={styles.atomName}>
                        <strong>{String(atomDetails.label ?? "Not defined")}</strong>
                      </p>
                      
                      {/* Badge community avec tooltip */}
                      <div 
                        className={styles.badgeWrapper}
                        onMouseEnter={() => setShowTooltip('community')}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <img 
                          src={communityIcon} 
                          alt="Community" 
                          className={styles.badgeIcon}
                        />
                        {showTooltip === 'community' && (
                          <div className={`${styles.tooltip} ${styles.tooltipWide}`}>
                            This atom is community-created and has not been reviewed or approved by the rights holder
                            <div className={styles.tooltipArrow} />
                          </div>
                        )}
                      </div>
                    </div>
                    {showDescription && (
                      <div className={styles.descriptionScroll}>
                        <p className={styles.descriptionText}>{description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // ─── COMPORTEMENT PAR DÉFAUT (NORMAL) ──────────────────
                <div className={styles.rowFlex}>
                  {/* Image à gauche */}
                  <div className={styles.imageContainer}>
                    <SafeImage
                      src={imageUrl as string}
                      fallbackSources={imageFallbacks}
                      alt={atomDetails.label || "Atom image"}
                      style={{width: "100%", height: "100%", objectFit: "cover", borderRadius: "16px", display: "block" }}
                      placeholderText={atomDetails.emoji || "?"}
                      showPlaceholder={true}
                    />
                  </div>
                  
                  {/* Colonne droite: nom + description */}
                  <div className={styles.rightColumn}>
                    <p className={styles.atomNameAccent}>
                      <strong>{String(atomDetails.label ?? "Not defined")}</strong>
                    </p>
                    {showDescription && (
                      <div className={styles.descriptionScroll}>
                        <p className={styles.descriptionText}>{description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </>
  );
};

export default AtomDetailsSection;

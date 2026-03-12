import React from "react";
import { useEffect, useState } from "react";
import { fetchAtomDetails, type AtomDetails } from "../../api/fetchAtomDetails";
import { ipfsToHttpUrl, isIpfsUrl } from "../../utils/pinata";
import SafeImage from "../SafeImage";
import { getAtomVerificationStatus } from "../../config/verifiedAtoms";
import verifiedIcon from "../../assets/img/verified.svg";
import communityIcon from "../../assets/img/community.svg";

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
      <div style={{display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
        {/* Vérification de l'atome */}
        {(() => {
          const verification = getAtomVerificationStatus(atomDetails.term_id);
          
          return (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
              {verification.status === "verified" ? (
                // ─── ATOME VÉRIFIÉ ─────────────────────────────────────
                <div style={{display: "flex", flexDirection: "row", alignItems: "center", gap: "16px", width: "100%" }}>
                  {/* Image à gauche */}
                  <div style={{width: "70px", height: "70px", overflow: "hidden", borderRadius: "16px", flexShrink: 0 }}>
                    <SafeImage
                      src={imageUrl as string}
                      fallbackSources={imageFallbacks}
                      alt={atomDetails.label || "Atom image"}
                      style={{width: "100%", height: "100%", objectFit: "cover", borderRadius: "16px", display: "block" }}
                      placeholderText={atomDetails.emoji || "?"}
                      showPlaceholder={true}
                    />
                  </div>
                  
                  {/* Nom et badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                    <p style={{fontWeight: 700, fontSize: "1.5rem", color: "#ffffff", margin: "0px" }}>
                      <strong>{String(atomDetails.label ?? "Not defined")}</strong>
                    </p>
                    
                    {/* Badge verified avec tooltip */}
                    <div 
                      style={{ position: "relative", display: "inline-flex" }}
                      onMouseEnter={() => setShowTooltip('verified')}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <img 
                        src={verifiedIcon} 
                        alt="Verified" 
                        style={{ width: "24px", height: "24px", cursor: "pointer" }}
                      />
                      {showTooltip === 'verified' && (
                        <div style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          backgroundColor: "rgba(20, 20, 20, 0.8)",
                          color: "#fff",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          whiteSpace: "normal",
                          width: "240px",
                          wordBreak: "break-word",
                          textAlign: "center",
                          zIndex: 1000,
                          boxShadow: "0 4px 12px rgba(20, 20, 20, 0.9)",
                          lineHeight: "1.4",
                        }}>
                          Verified by {verification.studio}
                          <div style={{
                            position: "absolute",
                            top: "-4px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 0,
                            height: 0,
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderBottom: "6px solid rgba(20, 20, 20, 0.9)",
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : verification.status === "not-verified" ? (
                // ─── ATOME NON VÉRIFIÉ ─────────────────────────────────
                <div style={{display: "flex", flexDirection: "row", alignItems: "center", gap: "16px", width: "100%" }}>
                  {/* Nom et badge (sans image) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                    <p style={{fontWeight: 700, fontSize: "1.5rem", color: "#ffffff", margin: "0px" }}>
                      <strong>{String(atomDetails.label ?? "Not defined")}</strong>
                    </p>
                    
                    {/* Badge community avec tooltip */}
                    <div 
                      style={{ position: "relative", display: "inline-flex" }}
                      onMouseEnter={() => setShowTooltip('community')}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <img 
                        src={communityIcon} 
                        alt="Community" 
                        style={{ width: "24px", height: "24px", cursor: "pointer" }}
                      />
                      {showTooltip === 'community' && (
                        <div style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          backgroundColor: "rgba(20, 20, 20, 0.9)",
                          color: "#fff",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          whiteSpace: "normal",
                          maxWidth: "280px",
                          width: "280px",
                          zIndex: 1000,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                          textAlign: "center",
                          lineHeight: "1.4",
                        }}>
                          This atom is community-created and has not been reviewed or approved by the rights holder
                          <div style={{
                            position: "absolute",
                            top: "-4px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 0,
                            height: 0,
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderBottom: "6px solid rgba(20, 20, 20, 0.9)",
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // ─── COMPORTEMENT PAR DÉFAUT (NORMAL) ──────────────────
                <div style={{display: "flex", flexDirection: "row", alignItems: "center", gap: "16px", width: "100%" }}>
                  {/* Image à gauche */}
                  <div style={{width: "70px", height: "70px", overflow: "hidden", borderRadius: "16px", flexShrink: 0 }}>
                    <SafeImage
                      src={imageUrl as string}
                      fallbackSources={imageFallbacks}
                      alt={atomDetails.label || "Atom image"}
                      style={{width: "100%", height: "100%", objectFit: "cover", borderRadius: "16px", display: "block" }}
                      placeholderText={atomDetails.emoji || "?"}
                      showPlaceholder={true}
                    />
                  </div>
                  
                  {/* Nom sans badge */}
                  <p style={{fontWeight: 700, fontSize: "1.5rem", color: "#FFD32A", margin: "0px" }}>
                    <strong>{String(atomDetails.label ?? "Not defined")}</strong>
                  </p>
                </div>
              )}
            </div>
          );
        })()}
        {showDescription && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#FFD32A", textAlign: "left" }}>Description</h3>
            <div style={{ maxHeight:"85px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#ffd32a transparent" }}>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "rgba(255,255,255,0.9)", textAlign: "left" }}>
                {description}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AtomDetailsSection;

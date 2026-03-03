import React from "react";
import { useEffect, useState } from "react";
import { fetchAtomDetails, type AtomDetails } from "../../api/fetchAtomDetails";
import { ipfsToHttpUrl, isIpfsUrl } from "../../utils/pinata";
import SafeImage from "../SafeImage";

interface AtomDetailsSectionProps {
  atomDetails: any;
  connections: {
    follows: any[];
    followers: any[];
  };
  walletAddress?: string;
}

const AtomDetailsSection: React.FC<AtomDetailsSectionProps> = ({
  atomDetails,
  connections,
  walletAddress,
}) => {
  const [ipfsMetadata, setIpfsMetadata] = useState<any>(null);

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

  return (
    <>
      {/* Atom header */}
      <div style={{display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
        <div style={{width: "100px", height: "100px", overflow: "hidden", borderRadius: "16px" }}>
          <SafeImage
            src={imageUrl as string}
            fallbackSources={imageFallbacks}
            alt={atomDetails.label || "Atom image"}
            style={{width: "100%", height: "100%", objectFit: "contain", borderRadius: "16px", display: "block" }}
            placeholderText={atomDetails.emoji || "?"}
            showPlaceholder={true}
          />
        </div>
        <div style={{display: "flex", flexDirection: "column", width: "70%" }}>
          <p style={{fontWeight: 700, fontSize: "1.2rem", color: "#FFD32A",  margin: "0px" }}>
            <strong>{String(atomDetails.label ?? "Not defined")}</strong>
          </p>
          <p style={{fontSize: "0.875rem"}}>
            Following: {connections.followers.length} - Followers:{" "}
            {connections.follows.length}
          </p>
        </div>
        <h3 style={{ width:'100%', margin:0 }}>Description</h3>
        <div style={{ width:"100%", height:"55px", marginBottom:"10px", overflowY: "auto", borderBottom: "1px solid #D9D9D9" }}>
          <p style={{ marginTop:"2px", marginBottom:"10px" }}>
            {description}
          </p>
        </div>
      </div>
      
    </>
  );
};

export default AtomDetailsSection;

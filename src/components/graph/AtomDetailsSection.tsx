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
  const [fullAtomDetails, setFullAtomDetails] = useState<AtomDetails | null>(null);
  const [loading, setLoading] = useState(false);

  // Charger les détails complets de l'atom si on n'a que l'ID
  useEffect(() => {
    const loadFullDetails = async () => {
      if (!atomDetails) return;
      
      // Si atomDetails a déjà toutes les infos, l'utiliser directement
      if (atomDetails.value && atomDetails.image) {
        setFullAtomDetails(atomDetails);
        return;
      }

      // Sinon, charger les détails complets via l'API
      if (atomDetails.id || atomDetails.vault_id) {
        setLoading(true);
        try {
          const details = await fetchAtomDetails(atomDetails.id || atomDetails.vault_id);
          setFullAtomDetails(details);
        } catch (error) {
          console.error("Error loading atom details:", error);
          setFullAtomDetails(atomDetails); // Fallback sur les données partielles
        } finally {
          setLoading(false);
        }
      }
    };

    loadFullDetails();
  }, [atomDetails]);

  if (!atomDetails) return null;

  const displayDetails = fullAtomDetails || atomDetails;

  // Préparer l'URL d'image (support IPFS)
  const rawImageUrl = displayDetails.image as string | undefined;
  const imageUrl = rawImageUrl
    ? isIpfsUrl(rawImageUrl)
      ? ipfsToHttpUrl(rawImageUrl)
      : rawImageUrl
    : undefined;

  // Extraire la description selon le type d'atom
  const getDescription = () => {
    if (!displayDetails.value) return "No description available";
    
    const value = displayDetails.value;
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
      <div style={{display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
        <div style={{width: "100px", height: "100px", overflow: "hidden", borderRadius: "16px" }}>
          {loading ? (
            <div style={{
              width: "100%", 
              height: "100%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              background: "#f0f0f0",
              borderRadius: "16px"
            }}>
              Loading...
            </div>
          ) : (
            <SafeImage
              src={imageUrl as string}
              alt={displayDetails.label || "Atom image"}
              style={{width: "100%", height: "100%", objectFit: "contain", borderRadius: "16px", display: "block" }}
              placeholderText={displayDetails.emoji || "?"}
              showPlaceholder={true}
            />
          )}
        </div>
        <div style={{display: "flex", flexDirection: "column", width: "70%" }}>
          <p style={{fontWeight: 700, fontSize: "1.2rem", color: "#FFD32A",  margin: "0px" }}>
            <strong>{String(displayDetails.label ?? "Not defined")}</strong>
          </p>
          <p style={{fontSize: "0.875rem"}}>
            Following: {connections.followers.length} - Followers:{" "}
            {connections.follows.length}
          </p>
        </div>
        <h3 style={{ width:'100%', margin:0 }}>Description</h3>
        <div style={{ width:"100%", height:"55px", marginBottom:"10px", overflowY: "auto", borderBottom: "1px solid #D9D9D9" }}>
          <p style={{ marginTop:"2px", marginBottom:"10px" }}>
            {loading ? "Loading description..." : getDescription()}
          </p>
        </div>
      </div>
      
    </>
  );
};

export default AtomDetailsSection;

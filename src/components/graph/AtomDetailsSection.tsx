import React from "react";
import { useEffect, useState } from "react";
import { fetchAtomDetails, type AtomDetails } from "../../api/fetchAtomDetails";
import { ipfsToHttpUrl, isIpfsUrl } from "../../utils/pinata"; // si vous voulez convertir ipfs:// en https

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
  if (!atomDetails) return null;

  // Préparer l'URL d'image (support IPFS)
  const rawImageUrl = atomDetails.image as string | undefined;
  const imageUrl = rawImageUrl
    ? isIpfsUrl(rawImageUrl)
      ? ipfsToHttpUrl(rawImageUrl)
      : rawImageUrl
    : undefined;

  return (
    <>
      {/* Atom header */}
      <div style={{display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
        <div style={{width: "100px", height: "100px", overflow: "hidden", borderRadius: "16px" }}>
          {imageUrl ? (
            <img
              src={imageUrl as string}
              alt={atomDetails.label || "Atom image"}
              style={{width: "100%", height: "100%", objectFit: "contain", borderRadius: "16px", display: "block" }}
            />
          ) : (
            <div
              style={{width: "100%", height: "100%", display: "flex",  justifyContent: "center", alignItems: "center", borderRadius: "16px", backgroundColor: "rgba(255, 255, 255, 0.1)" }}>
              No image
            </div>
          )}
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
            {atomDetails.value?.person?.description ||
              atomDetails.value?.organization?.description ||
              atomDetails.value?.thing?.description ||
              atomDetails.value?.book?.description ||
              "No description available"}
          </p>
        </div>
      </div>
      
    </>
  );
};

export default AtomDetailsSection;

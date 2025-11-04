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
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            overflow: "hidden",
            borderRadius: "16px",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={atomDetails.label || "Atom image"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "16px",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              No image
            </div>
          )}
        </div>
        <div className="flex-col w-4/6 gap-2 text-primary">
          <p className="bold text-2xl capitalize">
            <strong>{String(atomDetails.label ?? "Not defined")}</strong>
          </p>
          <p className="text-sm">
            Following: {connections.followers.length} - Followers:{" "}
            {connections.follows.length}
          </p>
        </div>

        <div className="flex-col w-full h-[70px] gap-2 text-[#D9D9D9] border-b-1 border-[#D9D9D9] overflow-y-auto">
          <p>
            <strong>Description :</strong> <br />
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

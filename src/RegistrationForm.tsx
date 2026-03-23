import React, { useState, useEffect, useRef } from "react";
import { getEventSelector, toHex, getAddress } from "viem";
import IntuitionLogo from "./assets/img/logo.svg";
import {
  ATOM_CONTRACT_ADDRESS,
  VALUE_PER_ATOM,
  atomABI,
  ATOM_CONTRACT_CHAIN_ID,
} from "./abi";
import { ipfsToHttpUrl, isIpfsUrl, uploadToPinata } from "./utils/pinata";
import PlayerCreationProgress from "./PlayerCreationProgress";
import { usePlayerCreationService } from "./services/playerCreationService";
import { useNetworkCheck } from "./shared/hooks/useNetworkCheck";
import { NetworkSwitchMessage } from "./shared/components/NetworkSwitchMessage";
import { DefaultPlayerMapConstants } from "./types/PlayerMapConfig";
import styles from "./RegistrationForm.module.css";
import { usePlayerAliases } from './hooks/usePlayerAliases';
import { useCreateAlias } from './hooks/useCreateAlias';
import { useDepositTriple } from './hooks/useDepositTriple';
import { VoteDirection } from './types/vote';

interface RegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  walletConnected?: any; // Renamed from walletClient to walletConnected
  walletAddress?: string; // Renamed from address to walletAddress
  wagmiConfig?: any; // Wagmi configuration provided by the main app
  walletHooks?: {
    useAccount?: any;
    useConnect?: any;
    useWalletClient?: any;
    usePublicClient?: any;
  };
  constants: DefaultPlayerMapConstants; // Constantes injectées
}

// Utility function to correctly encode in bytes
function stringToHex(str: string): `0x${string}` {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const hexValue = charCode.toString(16);
    hex += hexValue.padStart(2, "0");
  }
  return `0x${hex}` as `0x${string}`;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  isOpen,
  onClose,
  walletConnected,
  walletAddress,
  wagmiConfig,
  walletHooks,
  constants,
}) => {
  const [formData, setFormData] = useState({
    pseudo: "",
    image: "",
    guildId: "",
  });
  const [hasExistingAtom, setHasExistingAtom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState(false);
  const [atomId, setAtomId] = useState<string | null>(null);
  const publicClient = wagmiConfig?.publicClient;
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State variables for tracking creation steps
  const [step, setStep] = useState(1);
  const [isCreatingAtom, setIsCreatingAtom] = useState(false);
  const [isCreatingTriples, setIsCreatingTriples] = useState(false);
  const [tripleCreated, setTripleCreated] = useState(false);

  // Use the complete player creation service that handles both atoms and triples
  const { createPlayer } = usePlayerCreationService(
    walletConnected,
    walletAddress || "",
    constants, // Passer les constantes personnalisées !
    publicClient
  );

  const [aliasInput, setAliasInput] = useState('');
  const [depositError, setDepositError] = useState<string | undefined>(undefined);

  const { aliases, playerAtomId, isLoading: aliasesLoading } = usePlayerAliases({
    walletAddress,
    constants,
  });

  const {
    createAlias,
    reset: resetAlias,
    step: aliasStep,
    isCreating,
    error: aliasError,
  } = useCreateAlias({
    walletConnected,
    walletAddress,
    constants,
    publicClient,
    playerAtomId,
  });

  const { depositTriple, isLoading: isDepositing } = useDepositTriple({
    walletConnected,
    walletAddress,
    publicClient,
  });

  const handleUseExistingAlias = async (tripleId: string) => {
    setDepositError(undefined);
    const result = await depositTriple([
      { claimId: tripleId, units: 1, direction: VoteDirection.For },
    ]);
    if (!result.success) {
      setDepositError(result.error ?? 'Deposit failed');
    }
  };

  const { isCorrectNetwork, currentChainId, targetChainId, allowedChainIds } =
    useNetworkCheck({
      walletConnected,
      publicClient: wagmiConfig?.publicClient,
    });

  useEffect(() => {
    const checkExistingAtom = async () => {
      if (!walletAddress || !publicClient) return;

      try {
        // Utiliser getEventSelector pour calculer la signature de l'événement AtomCreated
        const eventHash = getEventSelector(
          "AtomCreated(address,bytes32,bytes,address)"
        );

        // Utiliser fetch directement pour contourner le bug viem
        const response = await fetch(import.meta.env.VITE_INTUITION_RPC_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getLogs",
            params: [
              {
                address: ATOM_CONTRACT_ADDRESS,
                topics: [eventHash, walletAddress],
                fromBlock: "0x0",
                toBlock: "latest",
              },
            ],
            id: 1,
          }),
        });

        const data = await response.json();
        const logs = data.result || [];

        setHasExistingAtom(logs.length > 0);
      } catch (error) {
        console.error("Error checking atom ownership:", error);
        setHasExistingAtom(false);
      }
    };

    checkExistingAtom();
  }, [walletAddress, publicClient]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    try {
      setIsUploading(true);
      const ipfsUrl = await uploadToPinata(file);
      setFormData((prev) => ({
        ...prev,
        image: ipfsUrl,
      }));
      setIsUploading(false);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error uploading image. Please try again.");
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!walletAddress || !walletConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (hasExistingAtom) {
      alert("You already have an atom!");
      return;
    }

    if (!formData.pseudo) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      setIsCreatingAtom(true);
      setStep(1);

      // Use the complete service to create a player (atom + triples)
      const result = await createPlayer({
        pseudo: formData.pseudo,
        image: formData.image || undefined,
        guildId: formData.guildId ? BigInt(formData.guildId) : undefined,
      });

      setAtomId(result.atomId.toString());
      setIsCreatingAtom(false);

      // Update the step
      setStep(2);
      setIsCreatingTriples(true);

      // Wait a bit for the display of triples creation
      // (they are already being created via createPlayer)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsCreatingTriples(false);
      setTripleCreated(result.tripleCreated);
      setStep(3);
      setCreationSuccess(true);
      setIsLoading(false);

      // Close the form after 3 seconds
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error("Error creating player:", error);
      alert("Error creating player. Please try again.");
      setIsLoading(false);
      setIsCreatingAtom(false);
      setIsCreatingTriples(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.walletInfo}>
          <div>
            Wallet:{" "}
            {walletAddress
              ? walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4)
              : "Not connected"}
          </div>
        </div>

        <button
          onClick={onClose}
          className={styles.closeBtn}
        >
          ×
        </button>

        <img
          src={IntuitionLogo}
          alt="Intuition Logo"
          className={styles.logo}
        />
        <h2 className={styles.title}>
          Create Your Player
        </h2>

        {!isCorrectNetwork ? (
          <NetworkSwitchMessage
            currentChainId={currentChainId}
            targetChainId={targetChainId}
          />
        ) : ( 
          <PlayerCreationProgress
            step={step}
            isCreatingAtom={isCreatingAtom}
            isCreatingTriples={isCreatingTriples}
            creationSuccess={creationSuccess}
            atomId={atomId}
            tripleCreated={tripleCreated}
            walletAddress={walletAddress}
            hasExistingAtom={hasExistingAtom && playerAtomId !== null}
            formData={formData}
            handleInputChange={handleInputChange}
            handleSelectChange={handleSelectChange}
            handleFileUpload={handleFileUpload}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            constants={constants} // Passer les constantes personnalisées !
            aliases={aliases}
            aliasesLoading={aliasesLoading}
            aliasInput={aliasInput}
            onAliasInputChange={setAliasInput}
            onCreateAlias={() => createAlias(aliasInput)}
            onResetAlias={resetAlias}
            onUseExistingAlias={handleUseExistingAlias}
            aliasStep={aliasStep}
            isCreating={isCreating}
            aliasError={aliasError}
            isDepositing={isDepositing}
            depositError={depositError}
          />
        )}
      </div>
    </div>
  );
};

export default RegistrationForm;

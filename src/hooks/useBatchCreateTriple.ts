import { ATOM_CONTRACT_ADDRESS, VALUE_PER_TRIPLE, atomABI } from "../abi";
import { DefaultPlayerMapConstants } from "../types/PlayerMapConfig";

// Structure pour les triples à créer
export interface TripleToCreate {
  subjectId: bigint;
  predicateId: bigint;
  objectId: bigint;
}

interface UseBatchCreateTripleProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  constants: DefaultPlayerMapConstants; // Constantes injectées
}

export const useBatchCreateTriple = ({ walletConnected, walletAddress, publicClient, constants }: UseBatchCreateTripleProps) => {
  // Utiliser les constantes passées en paramètre
  const { PLAYER_TRIPLE_TYPES } = constants;
  // Fonction pour vérifier si un triple existe déjà
  const checkTripleExists = async (
    subjectId: bigint,
    predicateId: bigint,
    objectId: bigint
  ): Promise<boolean> => {
    if (!walletConnected || !walletAddress) {
      throw new Error("Wallet not connected");
    }

    try {
      // Choisir le client approprié pour la lecture
      const readClient = publicClient || walletConnected;

      // Vérifier que le client a bien la méthode readContract
      if (!readClient || typeof readClient.readContract !== 'function') {
        console.warn('No valid read client available to check if triple exists');
        return false;
      }

      // Vérifier si le triple existe déjà
      const exists = await readClient.readContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: "isTriple",
        args: [subjectId, predicateId, objectId],
      });

      return exists;
    } catch (error) {
      console.error("Error checking if triple exists:", error);

      // Si la première tentative échoue et que nous avons un publicClient différent, réessayer
      if (publicClient && publicClient !== walletConnected && typeof publicClient.readContract === 'function') {
        try {
          const exists = await publicClient.readContract({
            address: ATOM_CONTRACT_ADDRESS,
            abi: atomABI,
            functionName: "isTriple",
            args: [subjectId, predicateId, objectId],
          });
          return exists;
        } catch (e) {
          console.error("Second attempt failed when checking if triple exists:", e);
        }
      }

      return false;
    }
  };

  // Function to calculate required amount for a triple (uses VALUE_PER_TRIPLE directly)
  const calculateTripleAmount = async (
    subjectId: bigint,
    predicateId: bigint,
    objectId: bigint
  ): Promise<bigint> => {
    return VALUE_PER_TRIPLE;
  };

  // Function to create multiple triples in a single transaction
  const batchCreateTriple = async (triples: TripleToCreate[]): Promise<any> => {
    if (!walletConnected || !walletAddress) {
      throw new Error("Wallet not connected");
    }

    try {
      // Calculate required amounts for each triple (uses VALUE_PER_TRIPLE directly)
      const assets: bigint[] = [];
      let totalValue = 0n;

      for (const triple of triples) {
        assets.push(VALUE_PER_TRIPLE);
        totalValue += VALUE_PER_TRIPLE;
      }

      // Prepare arrays for createTriples function (v2)
      const subjectIds = triples.map((t) => `0x${t.subjectId.toString(16).padStart(64, '0')}` as `0x${string}`);
      const predicateIds = triples.map((t) => `0x${t.predicateId.toString(16).padStart(64, '0')}` as `0x${string}`);
      const objectIds = triples.map((t) => `0x${t.objectId.toString(16).padStart(64, '0')}` as `0x${string}`);

      // Call the contract
      const txHash = await walletConnected.writeContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: "createTriples",
        args: [subjectIds, predicateIds, objectIds, assets],
        value: totalValue,
        gas: 5000000n, // Limit gas to 5M to prevent MetaMask from using excessive values
      });

      // Wait for confirmation using a compatible method
      let receipt;
      if (walletConnected.waitForTransactionReceipt) {
        // New approach (Viem)
        receipt = await walletConnected.waitForTransactionReceipt({ hash: txHash });
      } else if (txHash.wait) {
        // Old approach (ethers.js)
        receipt = await txHash.wait();
      } else {
        // Passive wait if no method is available
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      return {
        hash: typeof txHash === 'string' ? txHash : txHash.hash,
        receipt
      };
    } catch (error) {
      console.error("Error batch creating triples:", error);
      throw error;
    }
  };

  // Fonction spécifique pour créer les triples de joueur
  const createPlayerTriples = async (playerAtomId: bigint): Promise<any> => {
    // Création dynamique des triples basée sur PLAYER_TRIPLE_TYPES
    const triplesToCreate: TripleToCreate[] = Object.entries(PLAYER_TRIPLE_TYPES)
      .filter(([key, value]) => 'objectId' in value && value.objectId !== null) // Exclure les triples avec objectId null (comme PLAYER_GUILD)
      .map(([key, value]) => ({
        subjectId: playerAtomId,
        predicateId: BigInt(value.predicateId),
        objectId: BigInt((value as any).objectId),
      }));

    return batchCreateTriple(triplesToCreate);
  };

  return {
    checkTripleExists,
    batchCreateTriple,
    createPlayerTriples,
  };
}; 
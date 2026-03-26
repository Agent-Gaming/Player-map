import { ATOM_CONTRACT_ADDRESS, VALUE_PER_TRIPLE, atomABI } from "../abi";
import { DefaultPlayerMapConstants } from "../types/PlayerMapConfig";
import { contractWrite, waitForReceipt } from "../utils/walletUtils";

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

export const useBatchCreateTriple = ({ walletConnected, walletAddress, publicClient }: UseBatchCreateTripleProps) => {
  const checkTripleExists = async (
    subjectId: bigint,
    predicateId: bigint,
    objectId: bigint
  ): Promise<boolean> => {
    try {
      const readClient = publicClient || walletConnected;
      if (!readClient?.readContract) return false;

      // isTriple(bytes32 termId) takes ONE arg — the pre-computed vault ID.
      // We must call calculateTripleId first to get that termId.
      const sub32  = `0x${subjectId.toString(16).padStart(64, '0')}` as `0x${string}`;
      const pred32 = `0x${predicateId.toString(16).padStart(64, '0')}` as `0x${string}`;
      const obj32  = `0x${objectId.toString(16).padStart(64, '0')}` as `0x${string}`;

      const termId = await readClient.readContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'calculateTripleId',
        args: [sub32, pred32, obj32],
      }) as `0x${string}`;

      const exists = await readClient.readContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'isTriple',
        args: [termId],
      });

      return Boolean(exists);
    } catch (error) {
      console.error("Error checking if triple exists:", error);
      return false;
    }
  };

  // Function to create multiple triples in a single transaction
  const batchCreateTriple = async (triples: TripleToCreate[]): Promise<any> => {
    if (!walletConnected || !walletAddress) {
      throw new Error("Wallet not connected");
    }

    try {
      // Fetch deposit + protocol fee from contract for triples
      let tripleDeposit = VALUE_PER_TRIPLE;
      let tripleCreationFee = 0n;
      if (publicClient?.readContract) {
        try {
          const config = await publicClient.readContract({
            address: ATOM_CONTRACT_ADDRESS,
            abi: atomABI,
            functionName: 'tripleConfig',
          }) as [bigint, bigint, bigint];
          tripleCreationFee = config[0]; // tripleCreationProtocolFee
          console.log('[batchCreateTriple] tripleConfig:', {
            tripleCreationProtocolFee: config[0]?.toString(),
            totalAtomDepositsOnTripleCreation: config[1]?.toString(),
          });
        } catch {
          // tripleConfig not available — try atomConfig as fallback (same fee structure)
          try {
            const atomCfg = await publicClient.readContract({
              address: ATOM_CONTRACT_ADDRESS,
              abi: atomABI,
              functionName: 'atomConfig',
            }) as [bigint, bigint];
            tripleCreationFee = atomCfg[0];
            console.log('[batchCreateTriple] tripleConfig failed, using atomConfig fee:', tripleCreationFee?.toString());
          } catch {
            console.warn('[batchCreateTriple] could not read any fee config, using env value:', VALUE_PER_TRIPLE?.toString());
          }
        }
      }
      // assets[i] = deposit + protocol fee (fee deducted internally by contract)
      const costPerTriple = tripleDeposit + tripleCreationFee;
      console.log('[batchCreateTriple] costs:', {
        tripleDeposit: tripleDeposit?.toString(),
        tripleCreationFee: tripleCreationFee?.toString(),
        costPerTriple: costPerTriple?.toString(),
      });

      const assets: bigint[] = [];
      let totalValue = 0n;

      for (const triple of triples) {
        assets.push(costPerTriple);
        totalValue += costPerTriple;
      }

      // Prepare arrays for createTriples function (v2)
      const subjectIds = triples.map((t) => `0x${t.subjectId.toString(16).padStart(64, '0')}` as `0x${string}`);
      const predicateIds = triples.map((t) => `0x${t.predicateId.toString(16).padStart(64, '0')}` as `0x${string}`);
      const objectIds = triples.map((t) => `0x${t.objectId.toString(16).padStart(64, '0')}` as `0x${string}`);

      // Simulate first to surface the actual revert reason
      if (publicClient?.simulateContract) {
        try {
          await publicClient.simulateContract({
            address: ATOM_CONTRACT_ADDRESS,
            abi: atomABI,
            functionName: 'createTriples',
            args: [subjectIds, predicateIds, objectIds, assets],
            value: totalValue,
            account: walletAddress as `0x${string}`,
          });
        } catch (simErr: any) {
          console.error('[batchCreateTriple] simulation raw error:', simErr);
          console.error('[batchCreateTriple] args used:', {
            contract: ATOM_CONTRACT_ADDRESS,
            subjectIds,
            predicateIds,
            objectIds,
            assets: assets.map(a => a?.toString()),
            totalValue: totalValue?.toString(),
            account: walletAddress,
          });
          const reason = simErr?.cause?.data?.errorName
            || simErr?.cause?.reason
            || simErr?.shortMessage
            || simErr?.message
            || String(simErr);
          throw new Error(`createTriples simulation failed: ${reason}`);
        }
      }

      // Call the contract
      const txHash = await contractWrite(walletConnected, {
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'createTriples',
        args: [subjectIds, predicateIds, objectIds, assets],
        value: totalValue,
        gas: 5000000n,
      });

      const receipt = await waitForReceipt(txHash, walletConnected, publicClient);

      return {
        hash: txHash,
        receipt
      };
    } catch (error) {
      console.error("Error batch creating triples:", error);
      throw error;
    }
  };

  // Compute the vault ID (term_id) of a triple deterministically using the contract's
  // pure calculateTripleId function. No gas required.
  const computeTripleId = async (
    subjectId: bigint,
    predicateId: bigint,
    objectId: bigint,
  ): Promise<bigint> => {
    const readClient = publicClient || walletConnected;
    if (!readClient?.readContract) {
      throw new Error('No read client available to compute triple ID');
    }
    const sub32 = `0x${subjectId.toString(16).padStart(64, '0')}` as `0x${string}`;
    const pred32 = `0x${predicateId.toString(16).padStart(64, '0')}` as `0x${string}`;
    const obj32 = `0x${objectId.toString(16).padStart(64, '0')}` as `0x${string}`;
    const result = await readClient.readContract({
      address: ATOM_CONTRACT_ADDRESS,
      abi: atomABI,
      functionName: 'calculateTripleId',
      args: [sub32, pred32, obj32],
    }) as `0x${string}`;
    return BigInt(result);
  };

  return {
    checkTripleExists,
    batchCreateTriple,
    computeTripleId,
  };
}; 
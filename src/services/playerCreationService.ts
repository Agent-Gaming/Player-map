import { useAtomCreation } from "../hooks/useAtomCreation";
import { useBatchCreateTriple, TripleToCreate } from "../hooks/useBatchCreateTriple";
import { DefaultPlayerMapConstants } from "../types/PlayerMapConfig";

// Interface pour les données du joueur
export interface PlayerData {
  pseudo: string;
  image?: string | undefined;
  guildId?: bigint;
}

// Service pour gérer la création complète d'un joueur (atome + triples)
export const usePlayerCreationService = (
  walletConnected: any,
  walletAddress: string,
  constants: DefaultPlayerMapConstants, // Constantes injectées
  publicClient?: any // Ajout du publicClient
) => {
  // Utiliser les constantes passées en paramètre
  const { PLAYER_TRIPLE_TYPES } = constants;
  
  // Hooks pour la création d'atomes et de triples
  const { createAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient });
  const { batchCreateTriple } = useBatchCreateTriple({ walletConnected, walletAddress, publicClient, constants });

  // Fonction pour créer un joueur complet
  const createPlayer = async (playerData: PlayerData): Promise<{
    atomId: bigint;
    ipfsHash: string;
    tripleCreated: boolean;
    transactionHash?: string;
  }> => {
    try {
      // Étape 1: Créer l'atome du joueur
      const atomResult = await createAtom({
        name: playerData.pseudo,
        image: playerData.image,
      });

      const playerAtomId = atomResult.atomId;

      // Pause de sécurité entre les transactions
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Étape 2: Créer les triples pour le joueur
      try {
        // Préparation des triples standard (dynamique)
        const triplesToCreate: TripleToCreate[] = Object.entries(PLAYER_TRIPLE_TYPES)
          .filter(([key, value]) => 'objectId' in value && value.objectId !== null) // Exclure les triples avec objectId null (comme PLAYER_GUILD)
          .map(([key, value]) => ({
            subjectId: playerAtomId,
            predicateId: BigInt(value.predicateId),
            objectId: BigInt((value as any).objectId),
          }));

        // Ajouter le triple de guilde si une guilde est spécifiée
        if (playerData.guildId) {
          triplesToCreate.push({
            subjectId: playerAtomId,
            predicateId: BigInt(PLAYER_TRIPLE_TYPES.PLAYER_GUILD.predicateId),
            objectId: playerData.guildId
          });
        }

        // Création en batch de tous les triples
        const tripleResult = await batchCreateTriple(triplesToCreate);

        return {
          atomId: playerAtomId,
          ipfsHash: atomResult.ipfsHash,
          tripleCreated: true,
          transactionHash: tripleResult.hash
        };
      } catch (tripleError) {
        console.error("Erreur lors de la création des triples:", tripleError);

        // Même si les triples échouent, l'atome a bien été créé
        return {
          atomId: playerAtomId,
          ipfsHash: atomResult.ipfsHash,
          tripleCreated: false,
          transactionHash: undefined
        };
      }
    } catch (error) {
      console.error("Erreur lors de la création du joueur:", error);
      throw error;
    }
  };

  return {
    createPlayer
  };
}; 
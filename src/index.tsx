import React from "react";
import PlayerMapHome from "./PlayerMapHome";
import RegistrationForm from "./RegistrationForm";
import PlayerMapGraph from "./PlayerMapGraph";
import GraphComponent from "./GraphComponent";
import { ClaimVoting } from "./components/vote/ClaimVoting";
import VotingModal from "./components/vote/VotingModal";
import { useDepositTriple } from "./hooks/useDepositTriple";
import { useCheckSpecificTriplePosition } from "./hooks/useCheckSpecificTriplePosition";
import { useDisplayTriplesWithPosition } from "./hooks/useDisplayTriplesWithPosition";
import { usePositions } from "./hooks/usePositions";
import { useClaimsBySubject } from "./hooks/useClaimsBySubject";
import { checkTriplePosition } from "./utils/debugPosition";
// Auth supprimé - plus nécessaire
import { initConfig, getConfig } from "./utils/config";

// Définition de l'interface de configuration pour l'API publique
export interface PlayerMapConfigType {
  apiUrl: string;
}

// Export des composants principaux
export {
  PlayerMapHome,
  RegistrationForm,
  PlayerMapGraph,
  GraphComponent,
  ClaimVoting,
  VotingModal,
  useDepositTriple,
  useCheckSpecificTriplePosition,
  useDisplayTriplesWithPosition,
  usePositions,
  useClaimsBySubject,
  checkTriplePosition,
};

// Exporter les types pour le composant de vote
export { VoteDirection, type Claim, type VoteItem, type DepositResponse } from './types/vote';
export { PREDEFINED_CLAIM_IDS, UNIT_VALUE } from './utils/constants';

// Exporter la configuration avec types explicites
export const PlayerMapConfig = {
  /**
   * Initialise la configuration de la bibliothèque Player-map
   * @param config Configuration contenant l'URL de l'API (obligatoire)
   */
  init: (config: PlayerMapConfigType) => {
    if (!config.apiUrl) {
      throw new Error(
        "L'URL de l'API est obligatoire pour initialiser Player-map"
      );
    }
    initConfig(config);
    return true;
  },

  /**
   * Récupère la configuration actuelle
   * @throws Error si la configuration n'a pas été initialisée
   */
  get: getConfig,
};

// Auth supprimé - plus nécessaire
import { setPinataConstants } from "./utils/globalConstants";

// Exporter setPinataConstants pour les apps
export { setPinataConstants };

// Exporter les hooks et types pour les alias
export { usePlayerAliases } from './hooks/usePlayerAliases';
export { useCreateAlias } from './hooks/useCreateAlias';
export type { PlayerAlias, AliasCreationStep } from './types/alias';
// AliasCreationState is internal to useCreateAlias — not exported publicly

// Exporter un composant par défaut
export default PlayerMapHome;

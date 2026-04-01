/**
 * Interface pour les constantes paramétrables de PlayerMap
 */
export interface PlayerMapConstants {
  COMMON_IDS: Record<string, string>;
  PLAYER_TRIPLE_TYPES: Record<string, any>;
  OFFICIAL_GUILDS: Array<{id: string, name: string}>;
  PREDEFINED_CLAIM_IDS: string[];
  HAS_ALIAS_PREDICATE_ID: string;
}

/**
 * Interface pour la configuration complète de PlayerMap
 */
export interface PlayerMapConfig {
  constants?: PlayerMapConstants;
}

/**
 * Interface pour les constantes par défaut (fallback)
 */
export interface DefaultPlayerMapConstants extends PlayerMapConstants {
  UNIT_VALUE: bigint; // Toujours dans Player-map, jamais paramétrable
}

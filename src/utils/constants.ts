// ** TESTNET **

// Prédicats communs
export const COMMON_IDS = {
  GAMES_ID: "0x5dc0a2335c12343d8e0f71b62a73fbf70d06fcbaf647f57d82a189873ad90da3",
  FOLLOWS: "0x8f9b5dc2e7b8bd12f6762c839830672f1d13c08e72b5f09f194cafc153f2df8a", // prédicat --> follows
  IS: "0x2af261bce70c2fc3a1abf882e3e89b23066fcd150bfda27fab69f9f55ed2d9d0",  // prédicat --> is
  IS_PLAYER_OF: "0x05f1707d8cb50571d01021f09a664826aa1be2ff43504c0cca55eef87142f84f",  // prédicat --> is player of
  HAS_ALIAS: '<HAS_ALIAS_PREDICATE_ID_PLACEHOLDER>', // predicate → has alias
};

export const HAS_ALIAS_PREDICATE_ID = COMMON_IDS.HAS_ALIAS;

// Types de triples pour les joueurs
export const PLAYER_TRIPLE_TYPES = {
  PLAYER_GAME: {
    predicateId: COMMON_IDS.IS_PLAYER_OF, // predicat --> is player of !!!
    objectId: COMMON_IDS.GAMES_ID // object --> games (BossFighters)
  },
  PLAYER_QUALITY_1: {
    predicateId: COMMON_IDS.IS, // predicat --> is 
    objectId: "0xc9559c712c264e5f94ce450ed9473c451b6fd01ab6a436a726fbae767cd67b9c" // object --> fairplay !!!
  },
  PLAYER_QUALITY_2: {
    predicateId: COMMON_IDS.IS, // predicat --> is 
    objectId: "0x56d28a901a7f2617247f1663b0c25c77ba6403a8141bac43b1e94eb32a2de941" // object --> strong boss !!!
  },
  PLAYER_QUALITY_3: {
    predicateId: COMMON_IDS.IS, // predicat --> is 
    objectId: "0xc8433466cda62c0e8bb4fc5433f3faa51949072d6c7b0df50a595c95fb97f1bb" // object --> strong fighter !!!
  },
  PLAYER_GUILD: {
    predicateId: COMMON_IDS.IS_PLAYER_OF, // predicat --> is player of !!!
    objectId: null // Sera défini dynamiquement en fonction du choix de guilde
  }
};

// Liste des guildes officielles du jeu
export const OFFICIAL_GUILDS = [
  { id: "0x4320ae619f6a9c9b79ee8e2a9415585aff1c287f0b72b08c049cf7a5780eb08d", name: "The Alchemists" }, // id --> The Alchemists !!!
  { id: "0x12d4b4425dcfeaf46af6543e8de0133f22f768a69d56a3aa28662ecb06aa9ca1", name: "Big Time Warriors" }, // id --> Big Time Warriors !!!
  { id: "0xd9e1d54c0cb904c23e04caea94f9d0dae00874ec18849ca74a832e94c6de01fa", name: "The NEST" }, // id --> The NEST !!!
  { id: "0xd473ceacf850609ff8881c398e85e59aadbc315588ca78182313cc1af05a2800", name: "Clock Work Gamers" }, // id --> Clock Work Gamers !!!
  { id: "0x14511bc4065a1e7d67ba7d50d4706a8899a148a2e68b55213794c14e347acaa", name: "Vast Impact Gaming" }, // id --> Vast Impact Gaming !!!
  // { id: "0x93815368a0d207e11be12da396d51dea4e3f8e637fe49f696648feb451f6f9c7", name: "Kraken Gaming" }, // id --> Kraken Gaming !!!
  // { id: "0x508dee963f045411bd0bf4ab9433f40b72ca4270eb0f31222f299211cffbb0bc", name: "FAM" } // id --> FAM
];

// Constantes pour les réponses API
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error'
};

// Temps d'attente pour des actions spécifiques (en ms)
export const TIMEOUT = {
  MODAL_CLOSE: 3000 // 3 secondes avant la fermeture d'un modal
};

// ** VOTE CONSTANTS **

// Fixed amount in wei for each voting unit
// Get from environment variable or use default
export const UNIT_VALUE = 10000000000000000n;

// List of predefined claim IDs for voting
// Note: These IDs correspond to actual triples in the blockchain
export const PREDEFINED_CLAIM_IDS = [
  "0x27191de92fe0308355319ec8f2359e5ce85123bd243bf7ffa6eb8028347b3eab", // toxic - is map of - bossfights
  "0x561a2c3e4359c8ed1c468aef27691e8e48b4424344a38c7693b9127b1911efc9", // toxic - is - fun
  "0x6d7e52c5e80bf6c2873a21cb7013ba0655dc0458c77f2c0e7446c49efdbd0033", // toxic - is - immersive
  // "0x9df847b39391899840d7973d9718d8caef5c5467dde9374a96d1f71727bae7c4" // toxic - is - balanced
];

// ** CONSTANTES PAR DÉFAUT POUR L'INJECTION **

// Constantes par défaut (fallback) pour l'injection
export const DEFAULT_CONSTANTS = {
  COMMON_IDS,
  PLAYER_TRIPLE_TYPES,
  OFFICIAL_GUILDS,
  PREDEFINED_CLAIM_IDS,
  HAS_ALIAS_PREDICATE_ID,
};
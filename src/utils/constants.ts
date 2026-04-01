// ** TESTNET **

// Prédicats communs
export const COMMON_IDS = {
  GAMES_ID: "0x15fd51c3248baf65414b97a52ff4302e653bd4f765e6784fd5eb4906ea322390",
  FOLLOWS: "0x8f9b5dc2e7b8bd12f6762c839830672f1d13c08e72b5f09f194cafc153f2df8a", // prédicat --> follows
  IS: "0xdd4320a03fcd85ed6ac29f3171208f05418324d6943f1fac5d3c23cc1ce10eb3",  // prédicat --> is
  IS_PLAYER_OF: "0x6bd2557fa101349b1adab869c7f14bdcb5dce3ae0bc722bee3ae183a544faa81",  // prédicat --> is player of
  HAS_ALIAS: '0x90b0a11a334ba1a7c3613ed8ea007f1f41b274892f0f05cc0b24d3ab34042d3c', // predicate → has alias
  IS_MEMBER_OF: '0xe489948c4bd4fa6f50f402434996b90942ab67585a71c71d81dff8e624f661d4', // predicate → is member of
  IN: '0xb0d3de9abeebc79e74504814f69d38eae809410c9759678855f79d1b4c7405cb', // predicate → in
  ACCEPTED: '0x69b32b0ec575de94fea50d8ed84f198d46ab1590b6ec10d6527a1cc93c2c2dc', // TODO: replace with real term_id once atom is created on-chain
};

export const HAS_ALIAS_PREDICATE_ID = COMMON_IDS.HAS_ALIAS;

// Types de triples pour les joueurs
export const PLAYER_TRIPLE_TYPES = {
  PLAYER_GAME: {
    predicateId: COMMON_IDS.IS_PLAYER_OF, // predicat --> is player of !!!
    objectId: COMMON_IDS.GAMES_ID, // object --> games (BossFighters)
    label: 'is player of BossFighters',
  },
  PLAYER_QUALITY_1: {
    predicateId: COMMON_IDS.IS,
    objectId: "0xe8c70540064241818928054f9d655b79a9fc06fad93967db766347d9ed678795", // object --> fairplay
    label: 'is fairplay',
  },
  PLAYER_QUALITY_2: {
    predicateId: COMMON_IDS.IS,
    objectId: "0x0b5b1eecbe6c655584f57c15b1fd0a8fbec0ba39bbc1f253824b2075739c3fe1", // object --> strong boss
    label: 'is strong boss',
  },
  PLAYER_QUALITY_3: {
    predicateId: COMMON_IDS.IS,
    objectId: "0x48e31f7beaec9a71b62de49865ee2ba664c72c6860f7802d2174d003e635ff7d", // object --> strong fighter
    label: 'is strong fighter',
  },
  PLAYER_GUILD: {
    predicateId: COMMON_IDS.IS_PLAYER_OF, // predicat --> is player of !!!
    objectId: null, // dynamically set based on guild choice — excluded from Phase 2 auto-claims
  }
};

// Liste des guildes officielles du jeu
export const OFFICIAL_GUILDS = [
  { id: "0x4320ae619f6a9c9b79ee8e2a9415585aff1c287f0b72b08c049cf7a5780eb08d", name: "The Alchemists" }, // id --> The Alchemists !!!
  { id: "0x12d4b4425dcfeaf46af6543e8de0133f22f768a69d56a3aa28662ecb06aa9ca1", name: "Big Time Warriors" }, // id --> Big Time Warriors !!!
  { id: "0xd9e1d54c0cb904c23e04caea94f9d0dae00874ec18849ca74a832e94c6de01fa", name: "The NEST" }, // id --> The NEST !!!
  { id: "0xd473ceacf850609ff8881c398e85e59aadbc315588ca78182313cc1af05a2800", name: "Clock Work Gamers" }, // id --> Clock Work Gamers !!!
  { id: "0x14511bc4065a1e7d67ba7d50d4706a8899a148a2e68b55213794c14e347acaa", name: "Vast Impact Gaming" }, // id --> Vast Impact Gaming !!!
  // { id: "0x93815368a0d207e11be12da396d51dea4e3f8e637fe49f696648feb451f6f9c7", name: "Kraken Gaming" }, // old wrong ID
  { id: "0x4ba717c7f309c98d2ba72c8412960af16872def8e8462f69da2e340762a01627", name: "Kraken Gaming" },
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
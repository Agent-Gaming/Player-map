// Player-map/src/utils/constants.ts

/**
 * Protocol-level Intuition predicate IDs — universal, never game-specific.
 * These are the only IDs that belong in the package.
 */
export const PREDICATES = {
  HAS_ALIAS:    '0x90b0a11a334ba1a7c3613ed8ea007f1f41b274892f0f05cc0b24d3ab34042d3c',
  IS_PLAYER_OF: '0x6bd2557fa101349b1adab869c7f14bdcb5dce3ae0bc722bee3ae183a544faa81',
  IS:           '0xdd4320a03fcd85ed6ac29f3171208f05418324d6943f1fac5d3c23cc1ce10eb3',
  IS_MEMBER_OF: '0xe489948c4bd4fa6f50f402434996b90942ab67585a71c71d81dff8e624f661d4',
  IN:           '0xb0d3de9abeebc79e74504814f69d38eae809410c9759678855f79d1b4c7405cb',
  ACCEPTED:     '0x69b32b0ec575de94fea50d8ed84f198d46ab1590b6ec10d6527a1cc93c2c2dc1',
  FOLLOWS:      '0x8f9b5dc2e7b8bd12f6762c839830672f1d13c08e72b5f09f194cafc153f2df8a',
} as const

// Fixed amount in wei for each voting unit — library constant, not game-specific
export const UNIT_VALUE = 10000000000000000n

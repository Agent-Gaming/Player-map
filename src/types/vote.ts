// Types for the voting component

// Vote direction (for or against)
export enum VoteDirection {
  For = 'FOR',
  Against = 'AGAINST',
  None = 'NONE'
}

// Base claim structure
export interface Claim {
  id: bigint;
  subject: string;
  predicate: string;
  object: string;
}

// Claim structure with voting information
export interface VoteItem extends Claim {
  units: number;         // Number of units for this claim
  direction: VoteDirection; // Direction of vote (FOR, AGAINST, NONE)
  term_id?: string;     // Vault ID used for FOR votes
  term_position_count?: number; // Number of positions in the FOR vault
  counter_term_id?: string; // Counter vault ID used for AGAINST votes
  counter_term_position_count?: number; // Number of positions in the AGAINST vault
  userHasPosition?: boolean; // Whether the user already has a position on this triple
  userPositionDirection?: VoteDirection; // Direction of the user's existing position
  userPositionTermId?: string; // Vault term_id holding the user's current position (for redeem on switch)
  userShares?: bigint; // Shares to redeem when switching direction
  userCurveId?: bigint; // Curve id for the current position vault
  subject_image?: string | null; // Image URL for the subject atom
  object_image?: string | null;  // Image URL for the object atom
  subject_term_id?: string | null;
  object_term_id?: string | null;
  subject_description?: string | null;
  object_description?: string | null;
  score_type?: string; // FeedbackScoreType — see src/config/scoreType.ts
  attestation_type?: string; // 'Maps'|'Characters'|'Mods'|'Weapons'|'Global' — Campaign tab only
  // Campaign tab only: position held strictly within the campaign's voting
  // window (deposits minus redemptions in [start_date, end_date]), distinct
  // from userHasPosition/userPositionDirection/userShares above — those stay
  // wired to the user's REAL, all-time vault balance because useSubmitVotes
  // needs the real balance to compute correct on-chain redeem amounts. Never
  // mix the two: these three drive display only (badges/disabled buttons).
  campaignHasPosition?: boolean;
  campaignPositionDirection?: VoteDirection;
  campaignPositionUnits?: number;
  // Campaign tab only: voter counts computed server-side within the
  // campaign's window (worker's computeCampaignVoteTotals), shown instead
  // of term_position_count/counter_term_position_count (the account's
  // real, all-time voter counts) for the same reason as the fields above —
  // except for a Global attestation shared with Feedback, which keeps
  // showing the real counts since that's the one true shared vault.
  campaignForVoters?: number;
  campaignAgainstVoters?: number;
}

// Response structure after a transaction
export interface DepositResponse {
  success: boolean;
  hash?: string;
  error?: string;
} 
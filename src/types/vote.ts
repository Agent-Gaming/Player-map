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
  subject_image?: string | null; // Image URL for the subject atom
  object_image?: string | null;  // Image URL for the object atom
}

// Response structure after a transaction
export interface DepositResponse {
  success: boolean;
  hash?: string;
  error?: string;
} 
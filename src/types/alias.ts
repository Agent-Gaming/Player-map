// src/types/alias.ts

export interface PlayerAlias {
  tripleId: string      // term_id of the triple (hex string, e.g. "0x5dc0a2...")
  pseudo: string        // data of the object atom (the pseudonym string)
  atomId: string        // term_id of the pseudo atom
  userPosition: bigint  // shares held by the user in the triple vault
  isPrimary: boolean    // true for the alias with the highest userPosition
}

export type AliasCreationStep =
  | 'idle'
  | 'creating-pseudo-atom'
  | 'creating-triple'
  | 'success'
  | 'error'

export interface AliasCreationState {
  step: AliasCreationStep
  error?: string
  // Stored as hex string (0x...) matching term_id format.
  // Preserved on error so that "retry" can skip atom creation and go straight to triple.
  pseudoAtomId?: string
  tripleId?: string
}

// --- Two-phase registration flow ---

export type RegistrationPhase =
  | 'input'              // user enters their pseudo
  | 'creating-identity'  // Phase 1 in progress (atom + account + alias triple)
  | 'identity-created'   // Phase 1 done → show available claims
  | 'creating-claims'    // Phase 2 in progress (user-selected triples)
  | 'complete'           // everything done
  | 'error'

export type IdentityCreationStep =
  | 'idle'
  | 'creating-pseudo-atom'
  | 'fetching-account-atom'
  | 'creating-account-atom'
  | 'creating-alias-triple'
  | 'success'
  | 'error'

export interface IdentityCreationState {
  step: IdentityCreationStep
  error?: string
  pseudoAtomId?: string    // preserved on error so retry skips atom creation
  accountAtomId?: string   // preserved on error so retry skips account atom creation
}

export interface ClaimOption {
  id: string              // key from PLAYER_TRIPLE_TYPES (e.g. "PLAYER_QUALITY_1")
  label: string           // human-readable label (e.g. "is fairplay")
  predicateAtomId: string // hex term_id of the predicate atom
  objectAtomId: string    // hex term_id of the object atom
}

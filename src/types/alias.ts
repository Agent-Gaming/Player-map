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
  | 'input'                  // user enters pseudo + guild choice
  | 'creating-identity'      // Phase 1 in progress (atom + account + alias triple + optional nested guild)
  | 'loading-existing'       // Phase 1 done; querying existing profile elements
  | 'ready-to-initialize'    // Existing items loaded; showing Player Initialization screen
  | 'creating-claims'        // Phase 2 in progress (creating to-create items)
  | 'complete'               // everything done
  | 'error'

export type IdentityCreationStep =
  | 'idle'
  | 'creating-pseudo-atom'
  | 'fetching-account-atom'
  | 'creating-account-atom'
  | 'creating-alias-triple'
  | 'creating-guild-membership'  // Step 1.4 — nested triple (aliasTriple → IS_MEMBER_OF → guild)
  | 'success'
  | 'error'

export interface IdentityCreationState {
  step: IdentityCreationStep
  error?: string
  pseudoAtomId?: string    // preserved on error so retry skips atom creation
  accountAtomId?: string   // preserved on error so retry skips account atom creation
  aliasTripleId?: string   // vault ID of the has-alias triple (computed via calculateTripleId)
}

export interface InitItem {
  id: string
  type: 'atom' | 'triple' | 'nested-triple'
  label: string
  description: string
  status: 'existing' | 'to-create' | 'creating' | 'created' | 'error'
  subjectId?: string       // hex string, used at creation time
  predicateId?: string
  objectId?: string
  resultTripleId?: string  // set after creation (or reused for existing items)
}

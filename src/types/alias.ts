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
  | 'signing-consent'           // EIP-712 off-chain, popup 1 (gratuit)
  | 'creating-consent-atom'     // createAtomFromIpfsUpload — popup 2 débute ici
  | 'creating-pseudo-atom'
  | 'fetching-account-atom'
  | 'creating-account-atom'
  | 'creating-alias-triple'
  | 'creating-accepted-triple'  // [Account] — [accepted] — [ConsentAtom]
  | 'creating-guild-membership'
  | 'success'
  | 'error'

export interface IdentityCreationState {
  step: IdentityCreationStep
  error?: string
  pseudoAtomId?: string    // preserved on error so retry skips atom creation
  accountAtomId?: string   // preserved on error so retry skips account atom creation
  aliasTripleId?: string   // vault ID of the has-alias triple (computed via calculateTripleId)
  // Preserved on error for targeted retry
  signature?: string        // set after popup 1 — not re-requested on retry
  consentAtomId?: string    // set after consent atom created — not re-created on retry
  _consentMessage?: Record<string, string>  // internal — message payload preserved for atom creation retry
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

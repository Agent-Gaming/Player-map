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

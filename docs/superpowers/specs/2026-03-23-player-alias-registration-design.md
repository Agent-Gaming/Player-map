# Design — Player Alias Registration (has alias)

**Date:** 2026-03-23
**Status:** Approved
**Repo:** Player-map (`player-map` npm library v2.0.11)

---

## Context

The Player-map library allows connected wallet users to register on-chain via the Intuition protocol. This feature adds the ability for a registered player to create one or more **aliases** (pseudonyms) linked to their existing player atom via a `[has alias]` triple.

---

## Decisions Made

| Question | Decision |
|---|---|
| Atom creation approach | Use existing `writeContract` pattern (no `@0xintuition/sdk`), raw bytes encoding via `toHex(str)` |
| UI integration | Extend existing `RegistrationForm` and `PlayerCreationProgress` components |
| Account Atom | Reuse the existing player atom `term_id` as the subject of `[has alias]` triples — no new atom for the wallet address |

---

## On-Chain Model

```
[Player Atom (existing JSON-LD)] — [has alias predicate] — [Pseudo Atom (raw string)]
         subject_id                      predicate_id              object_id
```

- **Player Atom**: already created during player registration — its `term_id` is the subject
- **Pseudo Atom**: new simple string atom, data = `toHex(pseudo)` (no JSON-LD, no IPFS)
- **Triple**: standard triple via `createTriples` contract call

### `term_id` format

All `term_id` values in this codebase are **numeric hex strings** (`0x5dc0a2...`). `BigInt("0x5dc0a2...")` is valid JavaScript and is the correct conversion. This applies to `playerAtomId`, `pseudoAtomId` stored in `AliasCreationState`, and `HAS_ALIAS_PREDICATE_ID`.

---

## Architecture

### Approach

Two focused hooks (read + write) following the existing pattern of `useClaimsBySubject` / `useDepositTriple`. No intermediate service layer.

### New Files

| File | Role |
|---|---|
| `src/api/fetchPlayerAliases.ts` | Two raw GraphQL fetch functions: player atom by address, alias triples with user position |
| `src/hooks/usePlayerAliases.ts` | Read hook — react-query wrapper, exposes `aliases`, `primaryAlias`, `playerAtomId`, `isLoading`, `error` |
| `src/hooks/useCreateAlias.ts` | Write hook — on-chain sequence orchestration, exposes `createAlias(pseudo)`, `step`, `isCreating`, `error` |
| `src/types/alias.ts` | `PlayerAlias`, `AliasCreationStep`, `AliasCreationState` (internal) |

### Modified Files

| File | Change |
|---|---|
| `src/hooks/useAtomCreation.ts` | Add `createStringAtom(str)` — raw bytes encoding, reuse shared `waitForAtomId` helper |
| `src/utils/constants.ts` | Add `HAS_ALIAS_PREDICATE_ID` placeholder |
| `src/types/PlayerMapConfig.ts` | Add `HAS_ALIAS_PREDICATE_ID: string` to `PlayerMapConstants` interface |
| `src/RegistrationForm.tsx` | Add alias hooks, branch render on `hasExistingAtom` |
| `src/PlayerCreationProgress.tsx` | Add alias section props and render |
| `src/index.tsx` | Export `usePlayerAliases`, `useCreateAlias` |

---

## Types

```typescript
// src/types/alias.ts

export interface PlayerAlias {
  tripleId: string      // term_id of the triple
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
  pseudoAtomId?: string  // preserved on error so triple creation can retry without re-creating the atom
  tripleId?: string
}
```

`PlayerMapConstants` (in `PlayerMapConfig.ts`) gains:
```typescript
HAS_ALIAS_PREDICATE_ID: string
```

---

## GraphQL Queries

File: `src/api/fetchPlayerAliases.ts`

Uses the same raw `fetch()` pattern and Hasura filter syntax (`_eq`) as the rest of the codebase.

```graphql
# Query 1 — get the player's existing atom by wallet address
# Order by term_id ascending to deterministically return the first (oldest) atom created.
# The player registration atom is always the earliest atom created by that address.
# If no atom is found (null result), the user is not yet registered — the alias section in
# RegistrationForm will not be shown because hasExistingAtom === false in that case.
query GetPlayerAtom($address: String!) {
  atoms(
    where: { creator_id: { _eq: $address } }
    order_by: { term_id: asc }
    limit: 1
  ) {
    term_id
  }
}

# Query 2 — get all [has alias] triples for the player, with user's own position
query GetAliasTriples($playerAtomId: String!, $predicateId: String!, $userAddress: String!) {
  triples(where: {
    subject_id: { _eq: $playerAtomId },
    predicate_id: { _eq: $predicateId }
  }) {
    term_id
    object {
      term_id
      data
    }
    vault {
      positions(where: { account_id: { _eq: $userAddress } }) {
        shares
      }
    }
  }
}
```

> Exact field names (`account_id` vs `account`, `shares` type) will be verified against the live schema during implementation.

---

## Hook Designs

### `useAtomCreation.ts` — added method

```typescript
const createStringAtom = async (str: string): Promise<{ atomId: bigint }> => {
  const dataBytes = toHex(str)
  // createAtoms ABI: (bytes[] data, uint256[] values)
  // args[0] = array of encoded atom data; args[1] = array of per-atom ETH amounts
  // transaction `value` = sum of all per-atom amounts (one atom → value === VALUE_PER_ATOM)
  const txHash = await walletConnected.writeContract({
    address: ATOM_CONTRACT_ADDRESS,
    abi: atomABI,
    functionName: 'createAtoms',
    args: [[dataBytes], [VALUE_PER_ATOM]],
    value: VALUE_PER_ATOM,
    gas: 2000000n,
  })
  return { atomId: await waitForAtomId(txHash) }
}
```

Receipt waiting + `AtomCreated` event parsing is extracted into a private `waitForAtomId(txHash)` helper within the same file (eliminates duplication with `createAtom`).

`createStringAtom` returns `atomId` as a `bigint` (the raw `termId` from the `AtomCreated` event). In `useCreateAlias`, store it as a hex string to match the `term_id` format used throughout: `pseudoAtomId = \`0x${result.atomId.toString(16)}\``.

### `usePlayerAliases.ts`

```typescript
export const usePlayerAliases = (walletAddress?: string, network?: Network) => {
  const predicateId = constants.HAS_ALIAS_PREDICATE_ID

  const { data: playerAtomId, isLoading: isLoadingAtom } = useQuery({
    queryKey: ['playerAtom', walletAddress],
    queryFn: () => fetchPlayerAtomByAddress(walletAddress!, network),
    enabled: Boolean(walletAddress),
    staleTime: 10 * 60 * 1000,
  })

  const { data: rawAliases, isLoading: isLoadingAliases, error } = useQuery({
    queryKey: ['playerAliases', playerAtomId, walletAddress],
    queryFn: () => fetchAliasTriplesWithPosition(playerAtomId!, walletAddress!, predicateId, network),
    enabled: Boolean(playerAtomId && walletAddress),
    staleTime: 2 * 60 * 1000,
  })

  const aliases: PlayerAlias[] = useMemo(() => {
    if (!rawAliases?.length) return []
    const sorted = [...rawAliases].sort((a, b) =>
      b.userPosition > a.userPosition ? 1 : -1
    )
    return sorted.map((a, i) => ({ ...a, isPrimary: i === 0 }))
  }, [rawAliases])

  // isLoading covers both queries: player atom fetch AND alias triples fetch
  return {
    aliases,
    primaryAlias: aliases.find(a => a.isPrimary) ?? null,
    playerAtomId: playerAtomId ?? null,
    isLoading: isLoadingAtom || isLoadingAliases,
    error,
  }
}
```

### `useCreateAlias.ts`

```typescript
export const useCreateAlias = (
  walletConnected: any,
  walletAddress: string | undefined,
  constants: DefaultPlayerMapConstants,
  publicClient: any | undefined,
  playerAtomId: string | null,
) => {
  const [state, setState] = useState<AliasCreationState>({ step: 'idle' })
  const queryClient = useQueryClient()
  const { createStringAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient })
  const { batchCreateTriple } = useBatchCreateTriple({ walletConnected, walletAddress, publicClient, constants })

  const createAlias = async (pseudo: string) => {
    if (!walletConnected || !walletAddress || !playerAtomId) return
    try {
      // Step 1 — create pseudo atom (skip if already created, e.g. on retry)
      let pseudoAtomId = state.pseudoAtomId
      if (!pseudoAtomId) {
        setState({ step: 'creating-pseudo-atom' })
        const result = await createStringAtom(pseudo)
        // Store as hex string to match term_id format (0x...) used throughout the codebase
        pseudoAtomId = `0x${result.atomId.toString(16)}`
        setState(s => ({ ...s, pseudoAtomId }))
      }

      // Step 2 — create triple
      setState(s => ({ ...s, step: 'creating-triple' }))
      await batchCreateTriple([{
        subjectId: BigInt(playerAtomId),
        predicateId: BigInt(constants.HAS_ALIAS_PREDICATE_ID),
        objectId: BigInt(pseudoAtomId),
      }])

      setState({ step: 'success' })
      await queryClient.invalidateQueries({ queryKey: ['playerAliases'] })
    } catch (err) {
      setState(s => ({
        ...s,
        step: 'error',
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  }

  // reset clears all state including pseudoAtomId — use only when the user explicitly cancels.
  // "Réessayer" must call createAlias(pseudo) directly (NOT reset first) to preserve pseudoAtomId
  // and skip the atom creation step on retry.
  const reset = () => setState({ step: 'idle' })

  return {
    createAlias,
    reset,
    step: state.step,
    isCreating: !['idle', 'success', 'error'].includes(state.step),
    error: state.error,
    pseudoAtomId: state.pseudoAtomId,
  }
}
```

---

## UI Design

### `RegistrationForm.tsx`

New state and hooks added:
```typescript
const [aliasInput, setAliasInput] = useState('')
const { aliases, primaryAlias, playerAtomId, isLoading: aliasesLoading } = usePlayerAliases(walletAddress, network)
const { createAlias, step: aliasStep, isCreating, error: aliasError, reset: resetAlias } = useCreateAlias(
  walletConnected, walletAddress, constants, publicClient, playerAtomId
)
```

Render branching logic (inside the existing `isCorrectNetwork` block):
- `hasExistingAtom === false` → existing player creation form (unchanged)
- `hasExistingAtom === true` → alias section (new)

### `PlayerCreationProgress.tsx` — alias section layout

```
┌─────────────────────────────────────┐
│  Tes alias existants                │
│  ┌──────────────────────────────┐   │
│  │ ★ vitalik42   [Utiliser]    │   │  ← badge ★ si isPrimary
│  │   cryptoKing  [Utiliser]    │   │
│  └──────────────────────────────┘   │
│                                     │
│  Créer un nouvel alias              │
│  [_______________] [Créer]          │
│                                     │
│  ── Progression ──                  │
│  ① Pseudo atom  ② Triple  ③ OK     │
└─────────────────────────────────────┘
```

The existing 3-step progress bar (yellow circles) is reused with new labels:
1. "Pseudo atom"
2. "Triple"
3. "Success"

### New props added to `PlayerCreationProgressProps`

```typescript
aliases: PlayerAlias[]
primaryAlias: PlayerAlias | null
aliasesLoading: boolean
aliasInput: string
onAliasInputChange: (val: string) => void
onCreateAlias: () => void
onUseExistingAlias: (tripleId: string) => void
aliasStep: AliasCreationStep
isCreating: boolean
aliasError?: string
// Deposit feedback (for "Utiliser" button)
isDepositing: boolean
depositError?: string
```

`PlayerCreationProgress` is a **presentational component** — it does not call any hooks. All hook logic lives in `RegistrationForm`:
- `useDepositTriple` is instantiated in `RegistrationForm`; its `isLoading` and any error are passed down as `isDepositing` / `depositError`
- `onUseExistingAlias` is a callback that calls `depositTriple` from `useDepositTriple`

### Reusing an existing alias

`onUseExistingAlias(tripleId)` is implemented in `RegistrationForm` by calling `depositTriple` (from `useDepositTriple`) with the triple's `term_id` and one unit of `VALUE_PER_TRIPLE`. `PlayerCreationProgress` shows a loading indicator on the alias row while `isDepositing === true`, and an inline error message if `depositError` is set.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Wallet not connected | Existing message, alias section not rendered |
| `aliasInput` empty | "Créer" button disabled |
| Transaction rejected | `step === 'error'`, inline error message + "Réessayer" button |
| Retry after atom created | `pseudoAtomId` preserved in state — skips atom creation, retries triple only |
| Network wrong | Existing `NetworkSwitchMessage` (unchanged) |

---

## Exports (`src/index.tsx`)

```typescript
export { usePlayerAliases } from './hooks/usePlayerAliases'
export { useCreateAlias } from './hooks/useCreateAlias'
export type { PlayerAlias, AliasCreationStep } from './types/alias'
// AliasCreationState is internal to useCreateAlias — not exported publicly
```

---

## Delivery Checklist

- [ ] No dead code — no unused imports, functions, or orphan files
- [ ] TypeScript strict — no `any` on new code (existing `any` patterns preserved for wallet clients)
- [ ] `HAS_ALIAS_PREDICATE_ID` placeholder clearly marked in constants
- [ ] Alias section shows existing aliases with "Utiliser" CTA
- [ ] Creation chains correctly: string atom → triple
- [ ] Progress visible per step
- [ ] Error at each step with retry preserving pseudo atom if already created
- [ ] react-query cache invalidated after mutation
- [ ] `usePlayerAliases` and `useCreateAlias` exported from `index.tsx`

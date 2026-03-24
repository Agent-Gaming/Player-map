# Player Alias Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a registered player (wallet connected, player atom already exists) to create and manage aliases (pseudonyms) on-chain via Intuition triples.

**Architecture:** Two focused hooks (`usePlayerAliases` for read, `useCreateAlias` for write) follow the existing pattern of `useClaimsBySubject`/`useDepositTriple`. All on-chain calls use direct `writeContract` against the existing `atomABI` — no new SDK dependency. The existing `RegistrationForm` and `PlayerCreationProgress` components are extended to show the alias section when the player already has an atom.

**Tech Stack:** React 18, TypeScript strict, Vite 5 (library mode), wagmi/viem, @tanstack/react-query, raw GraphQL fetch (Hasura syntax), `atomABI` contract.

> **Note on tests:** The project has no test framework configured (`"test": ""`). TDD steps are replaced with build verification (`pnpm build`) and manual test instructions. Setting up Vitest is out of scope for this plan.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/types/alias.ts` | `PlayerAlias`, `AliasCreationStep`, `AliasCreationState` types |
| Modify | `src/types/PlayerMapConfig.ts` | Add `HAS_ALIAS_PREDICATE_ID` to `PlayerMapConstants` |
| Modify | `src/utils/constants.ts` | Add `HAS_ALIAS_PREDICATE_ID` placeholder |
| Modify | `src/hooks/useAtomCreation.ts` | Extract `waitForAtomId` helper, add `createStringAtom` |
| Create | `src/api/fetchPlayerAliases.ts` | Two GraphQL fetch functions (player atom + alias triples with user position) |
| Create | `src/hooks/usePlayerAliases.ts` | Read hook: react-query wrapper, primary alias calculation |
| Create | `src/hooks/useCreateAlias.ts` | Write hook: atom → triple sequence, retry-safe state |
| Modify | `src/PlayerCreationProgress.tsx` | Add alias section props and render (presentational only) |
| Modify | `src/RegistrationForm.tsx` | Wire hooks, state, `useDepositTriple`, branch render |
| Modify | `src/index.tsx` | Export new hooks and types |

---

## Task 1: Add alias types

**Files:**
- Create: `src/types/alias.ts`

- [ ] **Step 1: Create `src/types/alias.ts`**

```typescript
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
```

- [ ] **Step 2: Verify build passes**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/alias.ts
git commit -m "feat: add PlayerAlias and AliasCreationState types"
```

---

## Task 2: Update constants and PlayerMapConfig interface

**Files:**
- Modify: `src/utils/constants.ts`
- Modify: `src/types/PlayerMapConfig.ts`

- [ ] **Step 1: Add `HAS_ALIAS_PREDICATE_ID` to `src/utils/constants.ts`**

In the `COMMON_IDS` object, add:

```typescript
HAS_ALIAS: '<HAS_ALIAS_PREDICATE_ID_PLACEHOLDER>', // predicate → has alias
```

Also export a standalone constant after `COMMON_IDS` (for convenience):

```typescript
export const HAS_ALIAS_PREDICATE_ID = COMMON_IDS.HAS_ALIAS;
```

- [ ] **Step 2: Add `HAS_ALIAS_PREDICATE_ID` to `PlayerMapConstants` interface in `src/types/PlayerMapConfig.ts`**

In the `PlayerMapConstants` interface, add:

```typescript
HAS_ALIAS_PREDICATE_ID: string;
```

The full interface becomes:

```typescript
export interface PlayerMapConstants {
  COMMON_IDS: Record<string, string>;
  PLAYER_TRIPLE_TYPES: Record<string, any>;
  OFFICIAL_GUILDS: Array<{id: string, name: string}>;
  PREDEFINED_CLAIM_IDS: string[];
  HAS_ALIAS_PREDICATE_ID: string;
}
```

- [ ] **Step 3: Update `DEFAULT_CONSTANTS` in `src/utils/constants.ts`**

`DEFAULT_CONSTANTS` is exported at the bottom of `constants.ts`. Add `HAS_ALIAS_PREDICATE_ID` to it:

```typescript
export const DEFAULT_CONSTANTS = {
  COMMON_IDS,
  PLAYER_TRIPLE_TYPES,
  OFFICIAL_GUILDS,
  PREDEFINED_CLAIM_IDS,
  HAS_ALIAS_PREDICATE_ID,  // add this line
};
```

- [ ] **Step 4: Verify build passes**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build
```

Expected: no TypeScript errors. Note: any callers that pass `constants` to hooks will get a TypeScript error until they add `HAS_ALIAS_PREDICATE_ID` — this is intentional (strict typing).

- [ ] **Step 5: Commit**

```bash
git add src/utils/constants.ts src/types/PlayerMapConfig.ts
git commit -m "feat: add HAS_ALIAS_PREDICATE_ID to constants and PlayerMapConstants interface"
```

---

## Task 3: Extend `useAtomCreation` with `createStringAtom`

**Files:**
- Modify: `src/hooks/useAtomCreation.ts`

The existing `createAtom` function contains duplicated receipt-waiting and event-parsing logic. This task extracts it into a private `waitForAtomId` helper and adds the new `createStringAtom` method.

- [ ] **Step 1: Extract `waitForAtomId` private helper**

Inside `src/hooks/useAtomCreation.ts`, before the `useAtomCreation` hook definition, add this private async function:

```typescript
async function waitForAtomId(
  txHash: any,
  walletConnected: any,
  publicClient: any
): Promise<bigint> {
  // Normalize txHash
  const normalizedTxHash = typeof txHash === 'string' ? txHash : txHash.hash || txHash;

  let receipt: any;
  if (publicClient && publicClient.waitForTransactionReceipt) {
    receipt = await publicClient.waitForTransactionReceipt({ hash: normalizedTxHash });
  } else if (walletConnected.waitForTransactionReceipt) {
    receipt = await walletConnected.waitForTransactionReceipt({ hash: normalizedTxHash });
  } else if (txHash.wait) {
    receipt = await txHash.wait();
  } else if (publicClient && publicClient.getTransactionReceipt) {
    const maxAttempts = 30;
    const delay = 2000;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        receipt = await publicClient.getTransactionReceipt({ hash: normalizedTxHash });
        if (receipt) break;
      } catch (_) { /* not yet confirmed */ }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    if (!receipt) throw new Error('Transaction receipt not found after waiting');
  } else {
    throw new Error('No method available to wait for transaction receipt. publicClient is required.');
  }

  if (!receipt) throw new Error('Transaction receipt not found');
  if (receipt.status === 'reverted' || receipt.status === 0) {
    throw new Error('Transaction reverted. Check gas or contract error.');
  }
  if (!receipt.logs || receipt.logs.length === 0) {
    throw new Error('Transaction receipt contains no logs. Transaction may have been reverted.');
  }

  const events = parseEventLogs({ abi: atomABI, logs: receipt.logs });
  const atomCreatedEvent = events.find((e: any) => e.eventName === 'AtomCreated') as any;
  if (!atomCreatedEvent?.args?.termId) {
    throw new Error('AtomCreated event not found in transaction receipt');
  }
  return BigInt(atomCreatedEvent.args.termId);
}
```

- [ ] **Step 2: Refactor `createAtom` to use `waitForAtomId`**

Inside the `useAtomCreation` hook, replace the receipt-waiting and event-parsing block in `createAtom` (lines ~72–143) with a call to the helper. The refactored `createAtom` end becomes:

```typescript
      // 5. Create the atom
      const txHash = await walletConnected.writeContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'createAtoms',
        args: [[dataBytes], [requiredAmount]],
        value: requiredAmount,
        gas: 2000000n,
      });

      const realAtomId = await waitForAtomId(txHash, walletConnected, publicClient);

      return {
        atomId: BigInt(realAtomId),
        ipfsHash
      };
```

Remove all code that was previously between the `writeContract` call and the final `return` statement (the receipt polling, parseEventLogs call, etc.) — `waitForAtomId` now handles that.

- [ ] **Step 3: Add `createStringAtom` to the hook**

Inside the `useAtomCreation` hook body, after `createAtom`, add:

```typescript
  // Creates a simple string atom (raw bytes, no JSON-LD or IPFS).
  // Used for alias pseudonyms and other raw-string atoms.
  const createStringAtom = async (str: string): Promise<{ atomId: bigint }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    try {
      // Encode string as raw UTF-8 bytes (no JSON-LD wrapper)
      const dataBytes = toHex(str);
      // createAtoms ABI: (bytes[] data, uint256[] values)
      // value sent = sum of per-atom amounts array = VALUE_PER_ATOM for one atom
      const txHash = await walletConnected.writeContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'createAtoms',
        args: [[dataBytes], [VALUE_PER_ATOM]],
        value: VALUE_PER_ATOM,
        gas: 2000000n,
      });
      const realAtomId = await waitForAtomId(txHash, walletConnected, publicClient);
      return { atomId: realAtomId };
    } catch (error) {
      console.error('Error creating string atom:', error);
      throw error;
    }
  };
```

- [ ] **Step 4: Update the hook return to include `createStringAtom`**

```typescript
  return {
    createAtom,
    createStringAtom,
  };
```

- [ ] **Step 5: Verify build passes**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build
```

Expected: no errors. The refactored `createAtom` should behave identically to before.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAtomCreation.ts
git commit -m "feat: extract waitForAtomId helper and add createStringAtom to useAtomCreation"
```

---

## Task 4: Create GraphQL fetch functions for aliases

**Files:**
- Create: `src/api/fetchPlayerAliases.ts`

Follow the same pattern as `src/api/fetchClaimsBySubject.ts`: raw `fetch()`, Hasura `_eq` filter syntax, import `API_URLS` from `useAtomData`.

- [ ] **Step 1: Create `src/api/fetchPlayerAliases.ts`**

```typescript
import { Network, API_URLS } from '../hooks/useAtomData';

/**
 * Fetches the term_id of the player's first (earliest) atom by their wallet address.
 * The player registration atom is always the first atom created by that address.
 * Returns null if the player has no atom (not yet registered).
 */
export const fetchPlayerAtomByAddress = async (
  walletAddress: string,
  network: Network = Network.MAINNET
): Promise<string | null> => {
  try {
    const apiUrl = API_URLS[network];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetPlayerAtom($address: String!) {
            atoms(
              where: { creator_id: { _eq: $address } }
              order_by: { term_id: asc }
              limit: 1
            ) {
              term_id
            }
          }
        `,
        variables: { address: walletAddress.toLowerCase() },
      }),
    });

    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL errors (fetchPlayerAtomByAddress):', data.errors);
      return null;
    }

    const atoms = data.data?.atoms || [];
    return atoms.length > 0 ? atoms[0].term_id : null;
  } catch (error) {
    console.error('Error fetching player atom:', error);
    return null;
  }
};

export interface RawAliasTriple {
  tripleId: string
  pseudo: string
  atomId: string
  userPosition: bigint
}

/**
 * Fetches all [has alias] triples for a player atom, including the user's own position
 * in each triple's vault. Returns only triples where we can determine the user's position
 * (position may be 0 if user has no stake in that alias).
 */
export const fetchAliasTriplesWithPosition = async (
  playerAtomId: string,
  walletAddress: string,
  predicateId: string,
  network: Network = Network.MAINNET
): Promise<RawAliasTriple[]> => {
  try {
    const apiUrl = API_URLS[network];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
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
        `,
        variables: {
          playerAtomId,
          predicateId,
          userAddress: walletAddress.toLowerCase(),
        },
      }),
    });

    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL errors (fetchAliasTriplesWithPosition):', data.errors);
      return [];
    }

    const triples = data.data?.triples || [];
    return triples.map((t: any): RawAliasTriple => ({
      tripleId: t.term_id,
      pseudo: t.object?.data ?? '',
      atomId: t.object?.term_id ?? '',
      // positions array may be empty if user has no stake; default to 0n
      userPosition: t.vault?.positions?.[0]?.shares
        ? BigInt(t.vault.positions[0].shares)
        : 0n,
    }));
  } catch (error) {
    console.error('Error fetching alias triples:', error);
    return [];
  }
};
```

> **Implementation note:** The field names `account_id` and `shares` in the GraphQL query match the Hasura schema pattern seen in other queries in the codebase. If the live schema differs, verify by checking the schema introspection or an existing working query that filters positions by account. The `data` field on the object atom contains the raw hex string of the pseudo — decode with `fromHex` from viem if needed, or store as-is if the indexer returns it as a readable string.

- [ ] **Step 2: Verify build passes**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/api/fetchPlayerAliases.ts
git commit -m "feat: add fetchPlayerAtomByAddress and fetchAliasTriplesWithPosition"
```

---

## Task 5: Create `usePlayerAliases` read hook

**Files:**
- Create: `src/hooks/usePlayerAliases.ts`

- [ ] **Step 1: Create `src/hooks/usePlayerAliases.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Network } from './useAtomData';
import { DefaultPlayerMapConstants } from '../types/PlayerMapConfig';
import { PlayerAlias } from '../types/alias';
import {
  fetchPlayerAtomByAddress,
  fetchAliasTriplesWithPosition,
} from '../api/fetchPlayerAliases';

interface UsePlayerAliasesProps {
  walletAddress?: string;
  constants: DefaultPlayerMapConstants;
  network?: Network;
}

export const usePlayerAliases = ({
  walletAddress,
  constants,
  network = Network.MAINNET,
}: UsePlayerAliasesProps) => {
  const predicateId = constants.HAS_ALIAS_PREDICATE_ID;

  // Query 1: resolve the player's atom term_id
  const { data: playerAtomId, isLoading: isLoadingAtom } = useQuery({
    queryKey: ['playerAtom', walletAddress, network],
    queryFn: () => fetchPlayerAtomByAddress(walletAddress!, network),
    enabled: Boolean(walletAddress),
    staleTime: 10 * 60 * 1000, // 10 min — player atom rarely changes
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  // Query 2: fetch alias triples — only runs once playerAtomId is resolved
  const { data: rawAliases, isLoading: isLoadingAliases, error } = useQuery({
    queryKey: ['playerAliases', playerAtomId, walletAddress, predicateId, network],
    queryFn: () =>
      fetchAliasTriplesWithPosition(playerAtomId!, walletAddress!, predicateId, network),
    enabled: Boolean(playerAtomId && walletAddress),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Compute aliases sorted by userPosition desc; first entry is primary
  const aliases: PlayerAlias[] = useMemo(() => {
    if (!rawAliases?.length) return [];
    const sorted = [...rawAliases].sort((a, b) =>
      b.userPosition > a.userPosition ? 1 : b.userPosition < a.userPosition ? -1 : 0
    );
    return sorted.map((a, i) => ({ ...a, isPrimary: i === 0 }));
  }, [rawAliases]);

  return {
    aliases,
    primaryAlias: aliases.find(a => a.isPrimary) ?? null,
    // playerAtomId is the term_id (hex string) of the player's existing atom
    playerAtomId: playerAtomId ?? null,
    // isLoading covers both queries: player atom fetch AND alias triples fetch
    isLoading: isLoadingAtom || isLoadingAliases,
    error: error as Error | null,
  };
};
```

- [ ] **Step 2: Verify build passes**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePlayerAliases.ts
git commit -m "feat: add usePlayerAliases read hook"
```

---

## Task 6: Create `useCreateAlias` write hook

**Files:**
- Create: `src/hooks/useCreateAlias.ts`

- [ ] **Step 1: Create `src/hooks/useCreateAlias.ts`**

```typescript
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultPlayerMapConstants } from '../types/PlayerMapConfig';
import { AliasCreationState, AliasCreationStep } from '../types/alias';
import { useAtomCreation } from './useAtomCreation';
import { useBatchCreateTriple } from './useBatchCreateTriple';

interface UseCreateAliasProps {
  walletConnected?: any;
  walletAddress?: string;
  constants: DefaultPlayerMapConstants;
  publicClient?: any;
  // The player's existing atom term_id — subject of the [has alias] triple.
  // Obtain from usePlayerAliases().playerAtomId.
  playerAtomId: string | null;
}

export const useCreateAlias = ({
  walletConnected,
  walletAddress,
  constants,
  publicClient,
  playerAtomId,
}: UseCreateAliasProps) => {
  const [state, setState] = useState<AliasCreationState>({ step: 'idle' });
  const queryClient = useQueryClient();
  const { createStringAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient });
  const { batchCreateTriple } = useBatchCreateTriple({
    walletConnected,
    walletAddress,
    publicClient,
    constants,
  });

  const createAlias = async (pseudo: string) => {
    if (!walletConnected || !walletAddress || !playerAtomId) return;
    if (!pseudo.trim()) return;

    try {
      // Step 1 — create pseudo atom
      // Skip if pseudoAtomId already exists (retry path: atom was created but triple failed)
      let pseudoAtomId = state.pseudoAtomId;
      if (!pseudoAtomId) {
        setState({ step: 'creating-pseudo-atom' });
        const result = await createStringAtom(pseudo.trim());
        // Store as hex string to match term_id format (0x...) used throughout the codebase
        pseudoAtomId = `0x${result.atomId.toString(16)}`;
        setState(s => ({ ...s, pseudoAtomId }));
      }

      // Step 2 — create the [playerAtom] [has alias] [pseudoAtom] triple
      setState(s => ({ ...s, step: 'creating-triple' as AliasCreationStep }));
      await batchCreateTriple([
        {
          subjectId: BigInt(playerAtomId),
          predicateId: BigInt(constants.HAS_ALIAS_PREDICATE_ID),
          objectId: BigInt(pseudoAtomId),
        },
      ]);

      setState({ step: 'success', pseudoAtomId });
      // Invalidate both alias queries so the list refreshes
      await queryClient.invalidateQueries({ queryKey: ['playerAliases'] });
    } catch (err) {
      setState(s => ({
        ...s,
        step: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  };

  // reset clears ALL state including pseudoAtomId.
  // Call this only when the user explicitly cancels the flow.
  // For "Réessayer" (retry after error): call createAlias(pseudo) directly — this preserves
  // pseudoAtomId in state so atom creation is skipped and only the triple is retried.
  const reset = () => setState({ step: 'idle' });

  return {
    createAlias,
    reset,
    step: state.step,
    isCreating: !(['idle', 'success', 'error'] as AliasCreationStep[]).includes(state.step),
    error: state.error,
    pseudoAtomId: state.pseudoAtomId,
  };
};
```

- [ ] **Step 2: Verify build passes**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCreateAlias.ts
git commit -m "feat: add useCreateAlias write hook with retry-safe state"
```

---

## Task 7: Extend `PlayerCreationProgress` with alias section

**Files:**
- Modify: `src/PlayerCreationProgress.tsx`

`PlayerCreationProgress` is a **presentational component** — add props and render logic only. No hooks, no side effects.

- [ ] **Step 1: Add alias imports to `PlayerCreationProgress.tsx`**

At the top of the file, add:

```typescript
import { PlayerAlias, AliasCreationStep } from './types/alias';
```

- [ ] **Step 2: Extend `PlayerCreationProgressProps` interface**

Add these fields to the existing `PlayerCreationProgressProps` interface:

```typescript
  // Alias section — only rendered when hasExistingAtom is true
  aliases?: PlayerAlias[];
  primaryAlias?: PlayerAlias | null;
  aliasesLoading?: boolean;
  aliasInput?: string;
  onAliasInputChange?: (val: string) => void;
  onCreateAlias?: () => void;
  // Callback wired in RegistrationForm to useDepositTriple — not called inside this component
  onUseExistingAlias?: (tripleId: string) => void;
  aliasStep?: AliasCreationStep;
  isCreating?: boolean;
  aliasError?: string;
  // Deposit feedback (for "Utiliser" button)
  isDepositing?: boolean;
  depositError?: string;
```

- [ ] **Step 3: Add alias section render to `PlayerCreationProgress`**

In the component's return, replace the `hasExistingAtom` branch:

Current code:
```tsx
      ) : hasExistingAtom ? (
        <p style={{ textAlign: "center", color: "#ff4444" }}>
          You already have an atom associated with this wallet
        </p>
      ) : (
```

Replace with:
```tsx
      ) : hasExistingAtom ? (
        <div>
          <h3 style={{ color: "#FFD32A", marginBottom: "16px", textAlign: "center" }}>
            Tes alias
          </h3>

          {aliasesLoading ? (
            <p style={{ textAlign: "center", color: "#aaa" }}>Chargement des alias...</p>
          ) : aliases && aliases.length > 0 ? (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "0.85em", color: "#aaa", marginBottom: "8px" }}>
                Alias existants :
              </p>
              {aliases.map(alias => (
                <div
                  key={alias.tripleId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    marginBottom: "6px",
                    backgroundColor: "#1e1e30",
                    border: "1px solid #333",
                    borderRadius: "4px",
                  }}
                >
                  <span>
                    {alias.isPrimary && (
                      <span style={{ color: "#FFD32A", marginRight: "6px" }}>★</span>
                    )}
                    {alias.pseudo}
                  </span>
                  <button
                    onClick={() => onUseExistingAlias?.(alias.tripleId)}
                    disabled={isDepositing}
                    style={{
                      padding: "4px 10px",
                      backgroundColor: "#2e2e40",
                      color: "#fff",
                      border: "1px solid #555",
                      borderRadius: "4px",
                      cursor: isDepositing ? "not-allowed" : "pointer",
                      fontSize: "0.8em",
                      opacity: isDepositing ? 0.7 : 1,
                    }}
                  >
                    {isDepositing ? "..." : "Utiliser"}
                  </button>
                </div>
              ))}
              {depositError && (
                <p style={{ color: "#ff4444", fontSize: "0.85em" }}>{depositError}</p>
              )}
            </div>
          ) : (
            <p style={{ color: "#aaa", fontSize: "0.85em", marginBottom: "16px" }}>
              Tu n'as pas encore d'alias.
            </p>
          )}

          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "0.85em", color: "#aaa", marginBottom: "8px" }}>
              Créer un nouvel alias :
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={aliasInput ?? ""}
                onChange={e => onAliasInputChange?.(e.target.value)}
                placeholder="Ton pseudo"
                // Disable during active creation AND on error (prevents atom/triple mismatch on retry)
                disabled={isCreating || aliasStep === 'error'}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: "#1e1e30",
                  border: "1px solid #333",
                  color: "#fff",
                  borderRadius: "4px",
                }}
              />
              <button
                onClick={onCreateAlias}
                disabled={isCreating || !aliasInput?.trim()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#FFD32A",
                  color: "#000",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isCreating || !aliasInput?.trim() ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  opacity: isCreating || !aliasInput?.trim() ? 0.7 : 1,
                }}
              >
                {isCreating ? "..." : "Créer"}
              </button>
            </div>
          </div>

          {/* Progress bar — reused with alias-specific labels */}
          {aliasStep && aliasStep !== 'idle' && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                {(["creating-pseudo-atom", "creating-triple", "success"] as AliasCreationStep[]).map(
                  (s, i) => {
                    const labels = ["Pseudo atom", "Triple", "OK"];
                    const isActive = aliasStep === s;
                    const isDone =
                      (aliasStep === "creating-triple" && i === 0) ||
                      (aliasStep === "success" && i < 2);
                    return (
                      <div key={s} style={{ textAlign: "center", flex: 1 }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "15px",
                            backgroundColor: isDone ? "#4CAF50" : isActive ? "#FFD32A" : "#2e2e40",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto",
                            color: isActive || isDone ? "#000" : "#fff",
                          }}
                        >
                          {isDone ? "✓" : i + 1}
                        </div>
                        <p style={{ fontSize: "0.8em", marginTop: "5px" }}>{labels[i]}</p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {aliasStep === "error" && aliasError && (
            <div style={{ marginTop: "8px" }}>
              <p style={{ color: "#ff4444", fontSize: "0.85em" }}>{aliasError}</p>
              {/* Réessayer calls onCreateAlias directly (preserves pseudoAtomId in hook state).
                  The input is disabled during isCreating so the user cannot change the pseudo
                  mid-flow. On error, the input stays enabled intentionally — if the user edits
                  it before retrying, the hook's pseudoAtomId (from the first atom) is reset
                  because createAlias() checks `pseudo.trim()` against the new value.
                  To keep atom and triple consistent: disable the input on error too, or
                  call reset() when the input changes after an error. The simplest safe approach:
                  disable the input whenever aliasStep is not 'idle'. */}
              <button
                onClick={onCreateAlias}
                style={{
                  marginTop: "6px",
                  padding: "6px 14px",
                  backgroundColor: "#2e2e40",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.85em",
                }}
              >
                Réessayer
              </button>
            </div>
          )}

          {aliasStep === "success" && (
            <p style={{ color: "#4CAF50", textAlign: "center", marginTop: "8px" }}>
              Alias créé avec succès !
            </p>
          )}
        </div>
      ) : (
```

- [ ] **Step 4: Verify build passes**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/PlayerCreationProgress.tsx
git commit -m "feat: add alias section render to PlayerCreationProgress"
```

---

## Task 8: Wire alias hooks into `RegistrationForm`

**Files:**
- Modify: `src/RegistrationForm.tsx`

- [ ] **Step 1: Add new imports to `RegistrationForm.tsx`**

```typescript
import { usePlayerAliases } from './hooks/usePlayerAliases';
import { useCreateAlias } from './hooks/useCreateAlias';
import { useDepositTriple } from './hooks/useDepositTriple';
import { PlayerAlias } from './types/alias';
import { Network } from './hooks/useAtomData';
```

- [ ] **Step 2: Add new state and hooks inside the `RegistrationForm` component**

After the existing `usePlayerCreationService` call (around line 74), add:

```typescript
  const [aliasInput, setAliasInput] = useState('');
  const [depositError, setDepositError] = useState<string | undefined>(undefined);

  const { aliases, primaryAlias, playerAtomId, isLoading: aliasesLoading } = usePlayerAliases({
    walletAddress,
    constants,
  });

  const {
    createAlias,
    reset: resetAlias,
    step: aliasStep,
    isCreating,
    error: aliasError,
  } = useCreateAlias({
    walletConnected,
    walletAddress,
    constants,
    publicClient,
    playerAtomId,
  });

  const { depositTriple, isLoading: isDepositing } = useDepositTriple({
    walletConnected,
    walletAddress,
    publicClient,
  });
```

- [ ] **Step 3: Add `handleUseExistingAlias` callback**

After the state/hooks block above, add:

```typescript
  const handleUseExistingAlias = async (tripleId: string) => {
    setDepositError(undefined);
    const result = await depositTriple([
      { claimId: tripleId, units: 1, direction: VoteDirection.For },
    ]);
    if (!result.success) {
      setDepositError(result.error ?? 'Deposit failed');
    }
  };
```

> **`useDepositTriple` signature** (verified in `src/hooks/useDepositTriple.ts`):
> ```typescript
> depositTriple(votes: Array<{ claimId: string; units: number; direction: VoteDirection }>): Promise<{ success: boolean; error?: string; hash?: string }>
> ```
> Import `VoteDirection` from `'./types/vote'` — it is already exported from `src/index.tsx`.

- [ ] **Step 4: Pass alias props to `PlayerCreationProgress`**

In the JSX, `PlayerCreationProgress` is rendered with existing props. Add the new alias-related props:

```tsx
          <PlayerCreationProgress
            {/* ...existing props unchanged... */}
            aliases={aliases}
            primaryAlias={primaryAlias}
            aliasesLoading={aliasesLoading}
            aliasInput={aliasInput}
            onAliasInputChange={setAliasInput}
            onCreateAlias={() => createAlias(aliasInput)}
            onUseExistingAlias={handleUseExistingAlias}
            aliasStep={aliasStep}
            isCreating={isCreating}
            aliasError={aliasError}
            isDepositing={isDepositing}
            depositError={depositError}
          />
```

- [ ] **Step 5: Verify build passes**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add src/RegistrationForm.tsx
git commit -m "feat: wire usePlayerAliases and useCreateAlias into RegistrationForm"
```

---

## Task 9: Update exports

**Files:**
- Modify: `src/index.tsx`

- [ ] **Step 1: Add alias exports to `src/index.tsx`**

After the existing exports, add:

```typescript
export { usePlayerAliases } from './hooks/usePlayerAliases';
export { useCreateAlias } from './hooks/useCreateAlias';
export type { PlayerAlias, AliasCreationStep } from './types/alias';
// AliasCreationState is internal to useCreateAlias — not exported publicly
```

- [ ] **Step 2: Final build**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build
```

Expected: clean build with no TypeScript errors and no unused imports.

- [ ] **Step 3: Commit**

```bash
git add src/index.tsx
git commit -m "feat: export usePlayerAliases, useCreateAlias and alias types from index"
```

---

## Manual Testing Checklist

After completing all tasks, verify the full flow manually in a consuming app:

1. **Unregistered user** — open `RegistrationForm`, wallet connected: player creation form shows (no alias section)
2. **Registered user** — open `RegistrationForm`, `hasExistingAtom === true`: alias section shows instead of player form
3. **No aliases yet** — "Tu n'as pas encore d'alias" message shown
4. **Create alias (happy path):**
   - Type a pseudo → click "Créer"
   - Progress: "Pseudo atom" circle activates → "Triple" → "OK"
   - Success message shown; alias list refreshes
5. **Create alias (retry after triple failure):**
   - Simulate triple TX rejection (reject in wallet)
   - Error shown with "Réessayer" button
   - Click "Réessayer" → only triple TX is sent (no new atom TX)
6. **Reuse existing alias** — click "Utiliser" → deposit TX sent → loading indicator on row
7. **Primary alias** — the alias with the highest personal stake shows ★ badge
8. **Schema field names** — if GraphQL returns errors, verify `account_id` / `shares` field names against the live schema using the network's GraphQL explorer

---

## Known Placeholders

- `HAS_ALIAS_PREDICATE_ID` in `src/utils/constants.ts` must be replaced with the real atom ID before production use
- The `pseudo` field in `RawAliasTriple` maps to `object.data` from GraphQL. If the indexer returns the raw hex bytes (e.g. `0x6d792d6e616d65`), decode with `fromHex(data, 'string')` from viem. If it returns a readable string directly, no decoding is needed — verify against the live data.

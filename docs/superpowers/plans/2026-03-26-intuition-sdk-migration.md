# @0xintuition/sdk Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw viem contract calls in `useAtomCreation` and `useBatchCreateTriple` with `@0xintuition/sdk@2.0.2`, fixing the account atom creation failure and eliminating manual fee calculation and simulation code.

**Architecture:** Swap internals of two hooks only — all public APIs preserved. `useAtomCreation` gains a new `createEthereumAccountAtom` helper used by `useRegisterPlayer` step 2. `computeTripleId` becomes a pure synchronous operation (no RPC). `fetchAccountAtom` gains a third search format for SDK-created atoms.

**Tech Stack:** `@0xintuition/sdk@2.0.2` (`createAtomFromString`, `createAtomFromThing`, `createAtomFromEthereumAccount`, `batchCreateTripleStatements`, `calculateTripleId`, `calculateAtomId`), `@0xintuition/graphql@^2.0.2`, viem `toHex` / `getAddress`.

---

## Critical: Address Encoding Formats

`createAtomFromEthereumAccount` stores `toHex(getAddress(address))` on-chain — a *different* encoding from the old `createStringAtom(rawHex=true)` which stored the raw 20-byte address. The three formats produce three different atom IDs:

| Format | Data stored | Atom ID (example) |
|---|---|---|
| Old rawHex | `0x73bd...fdfab` (20 bytes) | `0x32d0ec...` |
| SDK (`createAtomFromEthereumAccount`) | `toHex(getAddress(addr))` | `0x904832...` |
| Old UTF-8 | `toHex(addr.toLowerCase())` | `0xe237b4...` |

Both `fetchAccountAtom` and the on-chain fallback in `useRegisterPlayer` must handle all formats.

---

## File Map

| File | Change |
|---|---|
| `package.json` | Add `@0xintuition/sdk@^2.0.2` dep, remove `@0xintuition/graphql@1.0.0-alpha.1` |
| `src/hooks/useAtomData.ts` | Fix `createClient()` for graphql v2 API (`createServerClient` no longer takes `url`) |
| `src/hooks/useAtomCreation.ts` | Full internal rewrite; add `createEthereumAccountAtom` |
| `src/hooks/useBatchCreateTriple.ts` | Full internal rewrite |
| `src/api/fetchPlayerAliases.ts` | Add SDK address format to `fetchAccountAtom` |
| `src/hooks/useRegisterPlayer.ts` | Destructure `createEthereumAccountAtom`; update fallback + creation |

---

## Task 1: Install SDK and fix graphql v2

**Files:**
- Modify: `package.json`
- Modify: `src/hooks/useAtomData.ts`

This project has no automated test suite. Use `pnpm build` (TypeScript compile + bundle) as the verification step throughout.

- [ ] **Step 1.1: Update package.json**

In `package.json` `"dependencies"` section: remove `@0xintuition/graphql`, add `@0xintuition/sdk`.

```json
"dependencies": {
  "@0xintuition/sdk": "^2.0.2",
  "@tanstack/react-query": "^5.87.1",
  "axios": "^1.9.0",
  "playermap_graph": "0.2.6",
  "react-icons": "^5.5.0"
}
```

- [ ] **Step 1.2: Install**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm install
```

Expected: `@0xintuition/sdk@2.0.2`, `@0xintuition/protocol@2.0.2`, and `@0xintuition/graphql@2.x.x` appear in `node_modules/@0xintuition/`.

- [ ] **Step 1.3: Fix useAtomData.ts for graphql v2**

In graphql v2, `createServerClient` only accepts `{ token?: string }` — the `url` and `headers` fields are silently ignored. The URL must be set via `configureClient` before the call.

In `src/hooks/useAtomData.ts`, change line 1:
```typescript
// Before:
import { createServerClient, API_URL_DEV } from '@0xintuition/graphql';

// After:
import { createServerClient, configureClient, API_URL_DEV } from '@0xintuition/graphql';
```

Replace the `createClient` function body (lines 22-32):
```typescript
// Before:
export const createClient = (network: Network = Network.MAINNET): ReturnType<typeof createServerClient> => {
  const options = {
    url: API_URLS[network],
    headers: {
      'Content-Type': 'application/json',
    },
    token: undefined
  };
  return createServerClient(options);
};

// After:
export const createClient = (network: Network = Network.MAINNET): ReturnType<typeof createServerClient> => {
  configureClient({ apiUrl: API_URLS[network] });
  return createServerClient({});
};
```

- [ ] **Step 1.4: Verify build**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build 2>&1
```

Expected: build succeeds. The pre-existing "named and default exports" warning is acceptable.

- [ ] **Step 1.5: Commit**

```bash
git -C /home/james/PROJET/AGENT/Player-map add package.json pnpm-lock.yaml src/hooks/useAtomData.ts
git -C /home/james/PROJET/AGENT/Player-map commit -m "feat: install @0xintuition/sdk, fix graphql v2 compat in useAtomData"
```

---

## Task 2: Rewrite useAtomCreation.ts

**Files:**
- Modify: `src/hooks/useAtomCreation.ts`

Eliminated: `waitForAtomId()`, `parseEventLogs`, `hashDataToIPFS`, manual `atomConfig` readContract, `simulateContract` block.
Added: `createEthereumAccountAtom(address)` — wraps `createAtomFromEthereumAccount` so `useRegisterPlayer` has no direct SDK import.

The SDK's `createAtomFromThing` accepts `PinThingMutationVariables = { name, description?, image?, url?, emoji? }` and converts it to JSON-LD bytes on-chain.

- [ ] **Step 2.1: Replace the full file**

Write the complete replacement for `src/hooks/useAtomCreation.ts`:

```typescript
import {
  createAtomFromString,
  createAtomFromThing,
  createAtomFromEthereumAccount,
} from '@0xintuition/sdk';
import { ATOM_CONTRACT_ADDRESS } from '../abi';
import { ipfsToHttpUrl, isIpfsUrl } from '../utils/pinata';
import type { Address } from 'viem';

export type IpfsAtomInput = {
  name: string;
  description?: string;
  image?: string | undefined;
};

export interface UseAtomCreationProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
}

export const useAtomCreation = ({ walletConnected, walletAddress, publicClient }: UseAtomCreationProps) => {
  const writeConfig = {
    address: ATOM_CONTRACT_ADDRESS as Address,
    walletClient: walletConnected,
    publicClient,
  };

  /**
   * Creates a rich JSON-LD atom (name + optional image).
   * Converts IPFS image URLs to HTTP gateway URLs before storing.
   */
  const createAtom = async (input: IpfsAtomInput): Promise<{ atomId: bigint; ipfsHash: string }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    const imageUrl = input.image && isIpfsUrl(input.image)
      ? ipfsToHttpUrl(input.image)
      : input.image;

    const result = await createAtomFromThing(writeConfig, {
      name: input.name,
      image: imageUrl,
      description: input.description,
    });
    return {
      atomId: BigInt(result.state.termId),
      ipfsHash: result.uri ?? '',
    };
  };

  /**
   * Creates a plain UTF-8 string atom (pseudonym / username atoms without image).
   */
  const createStringAtom = async (str: string): Promise<{ atomId: bigint }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    const result = await createAtomFromString(writeConfig, str);
    return { atomId: BigInt(result.state.termId) };
  };

  /**
   * Creates an Ethereum account atom for a wallet address.
   * The SDK encodes the address as toHex(getAddress(address)) — 20 bytes checksummed.
   * Replaces the rawHex=true path previously in createStringAtom.
   */
  const createEthereumAccountAtom = async (address: string): Promise<{ atomId: bigint }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    const result = await createAtomFromEthereumAccount(writeConfig, address as Address);
    return { atomId: BigInt(result.state.termId) };
  };

  return {
    createAtom,
    createStringAtom,
    createEthereumAccountAtom,
  };
};
```

- [ ] **Step 2.2: Verify build**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build 2>&1
```

Expected: build succeeds. If TypeScript complains about `WriteConfig` (`walletClient` type), add `as any` to the `walletClient` field — the consuming app passes a Proxy wrapping a viem WalletClient which satisfies the runtime contract.

- [ ] **Step 2.3: Commit**

```bash
git -C /home/james/PROJET/AGENT/Player-map add src/hooks/useAtomCreation.ts
git -C /home/james/PROJET/AGENT/Player-map commit -m "feat: rewrite useAtomCreation with @0xintuition/sdk"
```

---

## Task 3: Rewrite useBatchCreateTriple.ts

**Files:**
- Modify: `src/hooks/useBatchCreateTriple.ts`

Eliminated: manual `tripleConfig` / `atomConfig` readContract calls, `simulateContract` block, `contractWrite`, `waitForReceipt`.

`computeTripleId` becomes a synchronous pure function (wrapped in `async` to preserve the existing public API).

`batchCreateTripleStatements` args shape: `[bytes32[], bytes32[], bytes32[], uint256[]]` (subjectIds, predicateIds, objectIds, assets). Use viem `toHex(bigint, { size: 32 })` to convert bigint IDs to `bytes32`.

- [ ] **Step 3.1: Replace the full file**

Write the complete replacement for `src/hooks/useBatchCreateTriple.ts`:

```typescript
import { batchCreateTripleStatements, calculateTripleId } from '@0xintuition/sdk';
import { toHex } from 'viem';
import { ATOM_CONTRACT_ADDRESS, atomABI } from '../abi';
import { DefaultPlayerMapConstants } from '../types/PlayerMapConfig';
import type { Address, Hex } from 'viem';

export interface TripleToCreate {
  subjectId: bigint;
  predicateId: bigint;
  objectId: bigint;
}

interface UseBatchCreateTripleProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  constants: DefaultPlayerMapConstants;
}

export const useBatchCreateTriple = ({ walletConnected, walletAddress, publicClient }: UseBatchCreateTripleProps) => {
  const writeConfig = {
    address: ATOM_CONTRACT_ADDRESS as Address,
    walletClient: walletConnected,
    publicClient,
  };

  /**
   * Check if a triple already exists on-chain.
   * calculateTripleId is pure (no RPC). isTriple is one readContract.
   */
  const checkTripleExists = async (
    subjectId: bigint,
    predicateId: bigint,
    objectId: bigint,
  ): Promise<boolean> => {
    try {
      const readClient = publicClient || walletConnected;
      if (!readClient?.readContract) return false;

      const termId = calculateTripleId(
        toHex(subjectId,   { size: 32 }),
        toHex(predicateId, { size: 32 }),
        toHex(objectId,    { size: 32 }),
      );

      const exists = await readClient.readContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'isTriple',
        args: [termId],
      });

      return Boolean(exists);
    } catch (error) {
      console.error('Error checking if triple exists:', error);
      return false;
    }
  };

  /**
   * Create one or more triples in a single transaction.
   * The SDK fetches getTripleCost() automatically.
   * assets[i] = 0n (no extra per-triple vault deposit).
   */
  const batchCreateTriple = async (triples: TripleToCreate[]): Promise<any> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }

    const subjectIds   = triples.map(t => toHex(t.subjectId,   { size: 32 }) as Hex);
    const predicateIds = triples.map(t => toHex(t.predicateId, { size: 32 }) as Hex);
    const objectIds    = triples.map(t => toHex(t.objectId,    { size: 32 }) as Hex);
    const assets       = triples.map(() => 0n);

    const result = await batchCreateTripleStatements(
      writeConfig,
      [subjectIds, predicateIds, objectIds, assets] as any,
    );

    return { hash: result.transactionHash, state: result.state };
  };

  /**
   * Compute the vault termId of a triple deterministically.
   * Uses calculateTripleId from SDK — pure, no RPC.
   * Returns bigint for API compatibility with existing callers.
   */
  const computeTripleId = async (
    subjectId: bigint,
    predicateId: bigint,
    objectId: bigint,
  ): Promise<bigint> => {
    const termId = calculateTripleId(
      toHex(subjectId,   { size: 32 }),
      toHex(predicateId, { size: 32 }),
      toHex(objectId,    { size: 32 }),
    );
    return BigInt(termId);
  };

  return {
    checkTripleExists,
    batchCreateTriple,
    computeTripleId,
  };
};
```

Note: `as any` on the `batchCreateTripleStatements` args prevents TypeScript complaints about `Hex[]` vs `readonly bytes32[]` type mismatch; the runtime values are correct.

- [ ] **Step 3.2: Verify build**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build 2>&1
```

Expected: build succeeds.

- [ ] **Step 3.3: Commit**

```bash
git -C /home/james/PROJET/AGENT/Player-map add src/hooks/useBatchCreateTriple.ts
git -C /home/james/PROJET/AGENT/Player-map commit -m "feat: rewrite useBatchCreateTriple with @0xintuition/sdk"
```

---

## Task 4: Update fetchAccountAtom for SDK address format

**Files:**
- Modify: `src/api/fetchPlayerAliases.ts`

`createAtomFromEthereumAccount` stores `toHex(getAddress(address))` — the checksummed address string UTF-8 encoded. This differs from both existing searches (`_ilike: $address` rawHex and `_ilike: $encoded` lowercase UTF-8). Add a third variable to the GraphQL query.

- [ ] **Step 4.1: Add import and third variable**

In `src/api/fetchPlayerAliases.ts`, line 2, the existing import is `import { toHex } from 'viem';`. Add `getAddress`:
```typescript
import { toHex, getAddress } from 'viem';
```

- [ ] **Step 4.2: Update the fetchAccountAtom function body**

Replace the const block inside `fetchAccountAtom` (lines 17-38):

```typescript
// Before:
const address = walletAddress.toLowerCase();
const encoded = toHex(address); // old format: UTF-8 encoding of address string
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query GetAccountAtom($address: String!, $encoded: String!) {
        atoms(
          where: { _or: [
            { data: { _ilike: $address } }
            { data: { _ilike: $encoded } }
          ]}
          order_by: { term_id: asc }
          limit: 1
        ) {
          term_id
        }
      }
    `,
    variables: { address, encoded },
  }),
});

// After:
const address   = walletAddress.toLowerCase();
const encoded   = toHex(address);               // old lowercase UTF-8 format
const sdkEncoded = toHex(getAddress(walletAddress)); // SDK format: toHex(checksummed)
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query GetAccountAtom($address: String!, $encoded: String!, $sdkEncoded: String!) {
        atoms(
          where: { _or: [
            { data: { _ilike: $address } }
            { data: { _ilike: $encoded } }
            { data: { _ilike: $sdkEncoded } }
          ]}
          order_by: { term_id: asc }
          limit: 1
        ) {
          term_id
        }
      }
    `,
    variables: { address, encoded, sdkEncoded },
  }),
});
```

Also update the comment at the top of `fetchAccountAtom` (line 5-9):
```typescript
/**
 * Fetches the term_id of the account atom for a wallet address.
 * Tries three storage formats:
 *   - raw bytes    : data == walletAddress (rawHex=true createStringAtom, legacy)
 *   - lowercase UTF-8: data == toHex(walletAddress) (old format)
 *   - SDK format   : data == toHex(getAddress(walletAddress)) (createAtomFromEthereumAccount)
 * Returns the lowest term_id match, or null if not found.
 */
```

- [ ] **Step 4.3: Verify build**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build 2>&1
```

Expected: build succeeds.

- [ ] **Step 4.4: Commit**

```bash
git -C /home/james/PROJET/AGENT/Player-map add src/api/fetchPlayerAliases.ts
git -C /home/james/PROJET/AGENT/Player-map commit -m "feat: add SDK address format to fetchAccountAtom"
```

---

## Task 5: Update useRegisterPlayer.ts

**Files:**
- Modify: `src/hooks/useRegisterPlayer.ts`

Changes:
1. Add `createEthereumAccountAtom` to `useAtomCreation` destructuring
2. Add `calculateAtomId` import from SDK and `getAddress` from viem
3. Replace on-chain fallback: use SDK `calculateAtomId` (pure) for both raw and SDK-format checks
4. Replace `createStringAtom(rawHex=true)` with `createEthereumAccountAtom`

- [ ] **Step 5.1: Update imports**

Add to the existing imports in `src/hooks/useRegisterPlayer.ts` (after line 9):
```typescript
import { calculateAtomId } from '@0xintuition/sdk';
import { toHex, getAddress } from 'viem';
import type { Hex } from 'viem';
```

`ATOM_CONTRACT_ADDRESS` and `atomABI` (line 10) must stay — still used by the `isAtom` readContract.

- [ ] **Step 5.2: Update useAtomCreation destructuring (line 48)**

```typescript
// Before:
const { createAtom, createStringAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient });

// After:
const { createAtom, createStringAtom, createEthereumAccountAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient });
```

- [ ] **Step 5.3: Replace the on-chain fallback and account atom creation (lines 88-120)**

Replace this entire block:
```typescript
        // On-chain fallback: calculateAtomId → isAtom
        // Handles the case where the atom exists on-chain but GraphQL doesn't find it
        // (data encoding mismatch between stored bytes and indexed string)
        if (!accountAtomId && publicClient?.readContract) {
          try {
            const rawAddressBytes = walletAddress.toLowerCase() as `0x${string}`;
            const computedId = await publicClient.readContract({
              address: ATOM_CONTRACT_ADDRESS,
              abi: atomABI,
              functionName: 'calculateAtomId',
              args: [rawAddressBytes],
            }) as `0x${string}`;
            const exists = await publicClient.readContract({
              address: ATOM_CONTRACT_ADDRESS,
              abi: atomABI,
              functionName: 'isAtom',
              args: [computedId],
            }) as boolean;
            if (exists) {
              console.log('[useRegisterPlayer] account atom found on-chain:', computedId);
              accountAtomId = computedId;
            }
          } catch (e) {
            console.warn('[useRegisterPlayer] on-chain atom lookup failed:', e);
          }
        }

        if (!accountAtomId) {
          setState(s => ({ ...s, step: 'creating-account-atom' }));
          // rawHex=true: store raw address bytes so fetchAccountAtom(_ilike address) finds it
          const result = await createStringAtom(walletAddress.toLowerCase() as `0x${string}`, true);
          accountAtomId = `0x${result.atomId.toString(16)}`;
        }
```

With:
```typescript
        // On-chain fallback: pure calculateAtomId (SDK) + isAtom (readContract)
        // Checks both legacy rawHex format and new SDK format (createAtomFromEthereumAccount)
        if (!accountAtomId && publicClient?.readContract) {
          const checkOnChain = async (atomData: Hex): Promise<string | null> => {
            try {
              const computedId = calculateAtomId(atomData);
              const exists = await publicClient.readContract({
                address: ATOM_CONTRACT_ADDRESS,
                abi: atomABI,
                functionName: 'isAtom',
                args: [computedId],
              }) as boolean;
              return exists ? `0x${BigInt(computedId).toString(16)}` : null;
            } catch {
              return null;
            }
          };
          // Check raw 20-byte format (legacy createStringAtom rawHex=true)
          const fromRaw = await checkOnChain(walletAddress.toLowerCase() as Hex);
          // Check SDK format: toHex(getAddress(address))
          const fromSdk = fromRaw ?? await checkOnChain(toHex(getAddress(walletAddress)) as Hex);
          if (fromSdk) {
            console.log('[useRegisterPlayer] account atom found on-chain:', fromSdk);
            accountAtomId = fromSdk;
          }
        }

        if (!accountAtomId) {
          setState(s => ({ ...s, step: 'creating-account-atom' }));
          const result = await createEthereumAccountAtom(walletAddress);
          accountAtomId = `0x${result.atomId.toString(16)}`;
        }
```

- [ ] **Step 5.4: Verify build**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build 2>&1
```

Expected: build succeeds and syncs to consuming app.

- [ ] **Step 5.5: Commit**

```bash
git -C /home/james/PROJET/AGENT/Player-map add src/hooks/useRegisterPlayer.ts
git -C /home/james/PROJET/AGENT/Player-map commit -m "feat: use createEthereumAccountAtom in useRegisterPlayer, SDK fallback"
```

---

## Task 6: Build, sync, and end-to-end verification

**Files:** None (no code changes)

- [ ] **Step 6.1: Build and sync to consuming app**

```bash
cd /home/james/PROJET/AGENT/Player-map && pnpm build:sync 2>&1
```

Expected: builds successfully, dist copied to consuming app, `.vite/deps` cleared.

- [ ] **Step 6.2: Start the consuming app and test the full registration flow**

```bash
cd /home/james/PROJET/AGENT/playermap.box/examples/test-player-map && pnpm dev
```

In the browser, verify:
1. Connect wallet (MetaMask — `account.address` from wagmi, not Privy embedded)
2. Click "Create Player"
3. Enter a username (with or without image)
4. Confirm — console should show SDK calls instead of raw viem simulation
5. Step 2 (account atom) should succeed — no more "An unknown error occurred"
6. Alias triple created
7. Guild triple created (if guild selected)
8. Player visible on the graph

- [ ] **Step 6.3: Check browser console for expected logs**

Confirm absence of:
- `createStringAtom simulation failed`
- `walletConnected does not support writeContract`

Confirm presence of:
- `[useRegisterPlayer] account atom found on-chain` (returning user) OR step 'creating-account-atom' completing without error (new user)

- [ ] **Step 6.4: Final commit**

```bash
cd /home/james/PROJET/AGENT/Player-map
git add -A
git commit -m "chore: player-map sdk migration complete (build:sync)"
```

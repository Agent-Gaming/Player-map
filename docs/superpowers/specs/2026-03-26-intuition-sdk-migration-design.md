# Design: Migration vers @0xintuition/sdk

**Date:** 2026-03-26
**Scope:** `player-map` library — hooks de création d'atoms et de triples
**Approche:** Option A — swap interne des hooks, API publique inchangée

---

## Contexte et problème

La création d'atoms on-chain repose actuellement sur des appels viem bruts :
- Calcul manuel des frais (`atomConfig` readContract)
- Encodage manuel des données (toHex, rawHex)
- Simulation (`simulateContract`) avant chaque écriture
- Parsing manuel des events (`parseEventLogs`) pour extraire le `termId`

Ce code est fragile : la simulation de `createAtoms` pour l'atom account (adresse wallet en rawHex) échoue systématiquement avec "An unknown error occurred" car le RPC Intuition ne retourne pas de revert data. L'atom account ne peut pas être créé.

---

## Solution

Remplacer les internals de `useAtomCreation` et `useBatchCreateTriple` par des appels `@0xintuition/sdk@2.0.2`. Le SDK gère fees, encodage, simulation et parsing en interne. L'API publique des hooks reste identique — aucun changement dans `useRegisterPlayer`, `PlayerMapHome`, ou les composants UI.

---

## Dépendances

### Ajout
```
@0xintuition/sdk@2.0.2
  └── @0xintuition/protocol@2.0.2  (bindings contrat typés, ABIs)
  └── @0xintuition/graphql@2.0.2   (remplace l'alpha.1 existant)
```

### Suppression
```
@0xintuition/graphql@1.0.0-alpha.1
```

### Migration graphql v1 → v2
`createServerClient` en v2 ne prend plus que `{ token?: string }` (le `url` est ignoré).
Fix dans `useAtomData.ts` : appeler `configureClient({ apiUrl: API_URLS[network] })` avant chaque `createServerClient({})` dans `createClient()`.
`configureClient` et `API_URL_DEV` ont des signatures identiques — aucun autre changement.

---

## Fichiers modifiés

| Fichier | Type de changement |
|---|---|
| `package.json` | Ajouter SDK, retirer graphql alpha |
| `src/hooks/useAtomCreation.ts` | Internals remplacés par SDK |
| `src/hooks/useBatchCreateTriple.ts` | Internals remplacés par SDK |
| `src/hooks/useRegisterPlayer.ts` | Step 2 : `createAtomFromEthereumAccount` |
| `src/hooks/useAtomData.ts` | Compat graphql v2 (`createClient`) |

---

## useAtomCreation.ts

### WriteConfig
Construit localement dans le hook à partir des props existantes :
```typescript
const writeConfig = {
  address: ATOM_CONTRACT_ADDRESS,
  walletClient: walletConnected,
  publicClient,
};
```

### Mapping des fonctions

| Ancienne fonction | SDK utilisé | Notes |
|---|---|---|
| `createStringAtom(str)` | `createAtomFromString(writeConfig, str)` | Plus d'encodage manuel |
| `createAtom({ name, image? })` | `createAtomFromIpfsUri(writeConfig, ipfsUrl)` si image déjà uploadée, sinon `createAtomFromThing(writeConfig, { name, image: undefined, description: undefined })` | L'upload Pinata reste dans `useRegisterPlayer` |
| _(nouveau)_ `createEthereumAccountAtom(address)` | `createAtomFromEthereumAccount(writeConfig, address)` | Encapsule la création de l'atom account. `useRegisterPlayer` appelle ce helper via `useAtomCreation` — pas d'import SDK direct dans `useRegisterPlayer`. |

### Interface de retour (inchangée)
```typescript
// createStringAtom
{ atomId: bigint }

// createAtom
{ atomId: bigint, ipfsHash: string }
```

Extraction : `result.state.termId` est un `bytes32` (`0x${string}`).
`atomId = BigInt(result.state.termId)`

### Suppressions
- `waitForAtomId()` — remplacée par le SDK
- Import `parseEventLogs` — plus nécessaire
- Import `hashDataToIPFS` — plus nécessaire
- Calcul manuel des frais (`atomConfig` readContract) — géré par le SDK
- Bloc `simulateContract` — géré par le SDK

---

## useBatchCreateTriple.ts

### WriteConfig
Même pattern que `useAtomCreation` :
```typescript
const writeConfig = {
  address: ATOM_CONTRACT_ADDRESS,
  walletClient: walletConnected,
  publicClient,
};
```

### Mapping des fonctions

| Ancienne fonction | Nouvelle implémentation |
|---|---|
| `batchCreateTriple(items)` | `batchCreateTripleStatements(writeConfig, [subjectIds, predicateIds, objectIds, assets])` |
| `computeTripleId(s, p, o)` | `calculateTripleId(s, p, o)` — **fonction pure, zéro RPC** |
| `checkTripleExists(s, p, o)` | `calculateTripleId(s, p, o)` + `publicClient.readContract(isTriple, id)` |

### Format des args pour batchCreateTripleStatements

`CreateTriplesInputs['args']` = `[bytes32[], bytes32[], bytes32[], uint256[]]` (subjectIds, predicateIds, objectIds, assets).

Conversion depuis le format interne actuel `{ subjectId: bigint, predicateId: bigint, objectId: bigint }[]` :
```typescript
import { toHex } from 'viem';
const subjectIds  = items.map(i => toHex(i.subjectId,   { size: 32 }));
const predicateIds = items.map(i => toHex(i.predicateId, { size: 32 }));
const objectIds   = items.map(i => toHex(i.objectId,    { size: 32 }));
const assets      = items.map(() => 0n); // pas de dépôt supplémentaire par triple
await batchCreateTripleStatements(writeConfig, [subjectIds, predicateIds, objectIds, assets]);
```

Le SDK fetche `getTripleCost()` automatiquement pour calculer `value` — plus de calcul manuel de frais.

### computeTripleId → calculateTripleId (pure)

```typescript
import { calculateTripleId } from '@0xintuition/sdk';
import { toHex } from 'viem';
const tripleId = calculateTripleId(
  toHex(subjectId,   { size: 32 }),
  toHex(predicateId, { size: 32 }),
  toHex(objectId,    { size: 32 }),
); // retourne bytes32 (0x${string})
```

### Suppressions
- Calcul manuel des frais triples (`tripleConfig` readContract)
- Bloc `simulateContract`
- `waitForReceipt` manuel

---

## useRegisterPlayer.ts — Step 2 (account atom)

### Avant
```typescript
// Fallback création : rawHex hack qui échoue en simulation
const result = await createStringAtom(walletAddress.toLowerCase() as `0x${string}`, true);
```

### Après
```typescript
// useAtomCreation expose createEthereumAccountAtom — le SDK gère l'encodage 20 bytes
const result = await createEthereumAccountAtom(walletAddress as Address);
// result.atomId est un bigint (BigInt(termId))
accountAtomId = `0x${result.atomId.toString(16)}`; // type: string (0x${string}), cohérent avec fetchAccountAtom
```

`accountAtomId` reste un `string` hexadécimal (`0x${string}`) dans tout le flow, identique au type retourné par `fetchAccountAtom` et par le fallback `calculateAtomId`. Les steps 3 et 4 font déjà `BigInt(accountAtomId)` pour passer les IDs aux fonctions de triple — aucun changement nécessaire là.

Le fallback on-chain remplace le `readContract(calculateAtomId)` actuel par la fonction pure du SDK :
```typescript
import { calculateAtomId } from '@0xintuition/sdk';
// Pur, zéro RPC — remplace l'appel readContract(calculateAtomId) existant
const atomId = calculateAtomId(walletAddress.toLowerCase() as Hex); // bytes32 (0x${string})
// isAtom reste un readContract avec ATOM_CONTRACT_ADDRESS + atomABI (src/abi.ts)
const exists = await publicClient.readContract({
  address: ATOM_CONTRACT_ADDRESS,
  abi: atomABI,
  functionName: 'isAtom',
  args: [atomId],
}) as boolean;
if (exists) accountAtomId = `0x${BigInt(atomId).toString(16)}`;
```

`createStringAtom(rawHex=true)` disparaît entièrement — le cas d'usage était uniquement l'atom account.

---

## Ce qui ne change pas

- `useRegisterPlayer.ts` — API publique (`register`, `reset`, `step`, `isRegistering`, `error`, IDs)
- `PlayerMapHome.tsx` — aucun changement
- `GraphComponent.tsx` — aucun changement
- Tous les composants UI
- `src/utils/pinata.ts` — `uploadToPinata` reste utilisé par `useRegisterPlayer` (step 1 avec image)
- `src/abi.ts` — aucun changement requis

---

## Flux complet après migration

```
register(pseudo, imageFile?)
  Step 1 — pseudo atom
    imageFile ?
      uploadToPinata(imageFile) → ipfsUrl
      createAtomFromIpfsUri(writeConfig, ipfsUrl) → pseudoAtomId
    :
      createAtomFromString(writeConfig, pseudo) → pseudoAtomId

  Step 2 — account atom
    existingAccountAtomId ? → skip
    fetchAccountAtom(graphql) → found ? → accountAtomId
    calculateAtomId(address) [pure] + isAtom(id) [read] → found ? → accountAtomId
    createAtomFromEthereumAccount(writeConfig, address) → accountAtomId  [via createEthereumAccountAtom in useAtomCreation]

  Step 3 — alias triple
    batchCreateTripleStatements(writeConfig, [{s, p, o}])
    calculateTripleId(s, p, o) [pure] → aliasTripleId

  Step 4 — guild membership (optionnel)
    batchCreateTripleStatements(writeConfig, [{aliasTriple, IS_MEMBER_OF, guild}])
```

---

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| `createAtomFromEthereumAccount` encode l'adresse différemment du `rawHex=true` | Returning users passent par `existingAccountAtomId` (bypass). Nouveaux users : le SDK crée l'atom correctement. `fetchAccountAtom` déjà adapté pour les deux formats. |
| graphql v2 casse `createClient()` réseau | Fix ciblé dans `useAtomData.ts` en première étape avant tout autre changement. |
| SDK version bump futur | `@0xintuition/sdk` sera en `peerDependency` du consumer — pas bundlé dans `player-map`. |

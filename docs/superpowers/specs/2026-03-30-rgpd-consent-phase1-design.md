# Design — Consentement RGPD intégré à la Phase 1

Date: 2026-03-30
Status: Approved

---

## Contexte

Le consentement RGPD est intégré directement dans la Phase 1 de création d'identité player. Le tout forme un seul bloc atomique du point de vue UX : un formulaire, un bouton, deux popups MetaMask.

---

## Flow UX

L'utilisateur remplit le formulaire (pseudo + guild + checkbox RGPD) et clique un seul bouton "Create Identity".

```
Création de votre identité player...

✅ Étape 1/6 : Signature des conditions (sans frais)      ← popup MetaMask signature
⏳ Étape 2/6 : Enregistrement de la preuve légale          ← popup MetaMask transaction
○  Étape 3/6 : Création du pseudo
○  Étape 4/6 : Liaison au compte
○  Étape 5/6 : Création de l'alias
○  Étape 6/6 : Adhésion à la guild
```

2 popups MetaMask au total :
- Popup 1 : signature EIP-712 (gratuit)
- Popup 2 : transaction batch qui crée tout le reste

---

## Approche choisie

**Option A — Étendre `useRegisterPlayer` directement.**

Toute la logique Phase 1 reste dans un seul hook. Le pattern retry-safe existant (state.pseudoAtomId, state.accountAtomId préservés sur erreur) est étendu avec state.signature et state.consentAtomId. Aucun hook supplémentaire, aucun code mort.

---

## Architecture technique

### 1. `utils/constants.ts`

Ajouter `ACCEPTED` à `COMMON_IDS` :

```typescript
ACCEPTED: '<ACCEPTED_PREDICATE_ID>',  // TODO: remplacer par le vrai term_id une fois l'atom créé on-chain
```

### 2. `types/alias.ts`

**`IdentityCreationStep`** — étendre avec les étapes consent insérées avant les étapes existantes :

```typescript
type IdentityCreationStep =
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
```

**`IdentityCreationState`** — ajouter les champs consent :

```typescript
interface IdentityCreationState {
  step: IdentityCreationStep
  error?: string
  // Existants (inchangés)
  pseudoAtomId?: string
  accountAtomId?: string
  aliasTripleId?: string
  // Nouveaux — préservés sur erreur pour retry ciblé
  signature?: string
  consentAtomId?: string
}
```

### 3. `api/fetchPlayerAliases.ts`

Ajouter `fetchAccountConsent` :

```typescript
export const fetchAccountConsent = async (
  accountAtomId: string,
  acceptedPredicateId: string,
  network?: Network
): Promise<{ exists: boolean; consentAtomId?: string }>
```

Query GraphQL : triples où `subject_id = accountAtomId` ET `predicate_id = acceptedPredicateId`. Retourne `exists: true` + `consentAtomId` (object atom id) si un triple est trouvé.

Appelée depuis `PlayerMapHome` au chargement du formulaire, après résolution de `playerAtomId`.

### 4. `hooks/useAtomCreation.ts`

Ajouter `createConsentAtom` :

```typescript
const createConsentAtom = async (consentJson: object): Promise<{ atomId: bigint }> => {
  const { PINATA_CONFIG } = getPinataConstants()
  const config = { ...writeConfig, pinataApiJWT: PINATA_CONFIG.JWT_KEY }
  const result = await createAtomFromIpfsUpload(config, consentJson)
  return { atomId: BigInt(result.state.termId) }
}
```

### 5. `hooks/useRegisterPlayer.ts`

**Nouvelles props :**

```typescript
interface UseRegisterPlayerProps {
  // ... existant inchangé ...
  consentAlreadyAccepted?: boolean  // skip étapes signing-consent et creating-consent-atom/accepted-triple
  walletClient?: any                 // pour signTypedData EIP-712
  chainId?: number                   // pour le domain EIP-712
}
```

**Payload EIP-712 :**

```typescript
const domain = {
  name: 'Player Map',
  version: '1',
  chainId: chainId,
} as const

const types = {
  TermsAcceptance: [
    { name: 'wallet',      type: 'address' },
    { name: 'termsVersion', type: 'string' },
    { name: 'termsURI',    type: 'string' },
    { name: 'privacyURI',  type: 'string' },
    { name: 'timestamp',   type: 'string' },
    { name: 'statement',   type: 'string' },
  ],
} as const

const message = {
  wallet: userAddress,
  termsVersion: 'v1.0',
  termsURI: 'ipfs://bafy.../terms-v1.0.pdf',    // TODO: CID réel
  privacyURI: 'ipfs://bafy.../privacy-v1.0.pdf', // TODO: CID réel
  timestamp: new Date().toISOString(),
  statement: 'I confirm that I have read and agree to the Terms of Service and Privacy Policy. I understand that blockchain records are permanent and that I am solely responsible for content I publish through this interface.',
} as const
```

**Nouveau flow dans `register()` :**

```
Étape 0 — signing-consent
  Skip si: consentAlreadyAccepted OU state.signature déjà présent
  → walletClient.signTypedData({ domain, types, primaryType: 'TermsAcceptance', message })
  → state.signature préservé

Étape 1 — creating-consent-atom
  Skip si: consentAlreadyAccepted OU state.consentAtomId déjà présent
  → buildConsentJson(message, keccak256(message), signature) → createConsentAtom(json)
  → state.consentAtomId préservé

Étapes 2-5 — existantes, inchangées
  (creating-pseudo-atom, fetching/creating-account-atom, creating-alias-triple)

Étape 6 — creating-accepted-triple
  Skip si: consentAlreadyAccepted
  → createTripleStatement([accountAtomId, ACCEPTED, consentAtomId])

Étape 7 — creating-guild-membership (optionnel, inchangé)
```

**JSON IPFS consent :**

```json
{
  "type": "terms_acceptance",
  "schema_version": "1.0",
  "accepted_at": "<timestamp ISO>",
  "terms_version": "v1.0",
  "terms_uri": "<termsURI>",
  "privacy_uri": "<privacyURI>",
  "message_hash": "<keccak256 du message signé>",
  "signature": "<signature EIP-712>"
}
```

Ne contient PAS : message en clair, pseudo, image, données profil.

### 6. `PlayerMapHome.tsx`

**Nouveaux states :**

```typescript
const [consentAlreadyAccepted, setConsentAlreadyAccepted] = useState(false)
const [rgpdChecked, setRgpdChecked] = useState(false)
```

**Au chargement du formulaire** (dans le `useEffect` qui résout `playerAtomId`) : appel `fetchAccountConsent(playerAtomId, ACCEPTED_PREDICATE_ID)` → `setConsentAlreadyAccepted`.

**Bouton VALIDATE désactivé si :** `isValidateDisabled || (!rgpdChecked && !consentAlreadyAccepted)`

**Dans le form, au-dessus du bouton :**
- Si `consentAlreadyAccepted` : `✅ Terms already accepted (v1.0)`
- Sinon : checkbox avec liens cliquables "Terms of Service" et "Privacy Policy"

**`handleValidate`** passe `consentAlreadyAccepted`, `walletClient`, `chainId` à `register()`.

### 7. `PlayerCreationProgress.tsx`

**`IDENTITY_STEPS`** étendu avec les nouvelles étapes dans le bon ordre.

**`IdentityProgressBar`** — étapes UI :

| # | Label | Affiché si |
|---|-------|-----------|
| 1 | Signature des conditions | toujours (sauf consent déjà accepté) |
| 2 | Preuve légale | toujours (sauf consent déjà accepté) |
| 3 | Username atom | toujours |
| 4 | Account | toujours |
| 5 | Alias link | toujours |
| 6 | Consentement lié | toujours (sauf consent déjà accepté) |
| 7 | Guild membership | si guild sélectionnée |

Si `consentAlreadyAccepted` : étapes 1, 2, 6 masquées (pas de barre réduite côté UX — ces étapes sont simplement absentes).

**`statusLabel`** mis à jour :
```typescript
'signing-consent':        'Signature des conditions (sans frais)...',
'creating-consent-atom':  'Enregistrement de la preuve légale...',
'creating-accepted-triple': 'Liaison du consentement...',
```

---

## Gestion d'erreurs

| Cas | Comportement |
|-----|-------------|
| Checkbox non cochée | Bouton désactivé, aucun message d'erreur |
| Signature refusée | `step: 'error'`, message "Signature annulée. Vous devez accepter les conditions pour continuer." Retry relance depuis `signing-consent` (state.signature undefined → popup re-déclenchée) |
| Transaction échouée après signature | Retry depuis l'étape échouée. `state.signature` préservé → popup 1 non redemandée |
| Consent atom déjà existant | `createAtomFromIpfsUpload` retourne l'existant — ID utilisé sans erreur |
| Account atom existant | Comportement existant inchangé |

---

## Checklist de livraison

- [ ] `ACCEPTED` ajouté à `COMMON_IDS` (placeholder `<ACCEPTED_PREDICATE_ID>`)
- [ ] `IdentityCreationStep` étendu avec les étapes consent
- [ ] `IdentityCreationState` étendu avec `signature` et `consentAtomId`
- [ ] `fetchAccountConsent` ajouté dans `api/fetchPlayerAliases.ts`
- [ ] `createConsentAtom` ajouté dans `hooks/useAtomCreation.ts`
- [ ] `useRegisterPlayer` : nouvelles props + étapes consent + retry-safe
- [ ] `PlayerMapHome` : checkbox RGPD, vérification au chargement, bouton conditionnel
- [ ] `PlayerCreationProgress` : barre de progression mise à jour 6-7 étapes
- [ ] Aucun code mort

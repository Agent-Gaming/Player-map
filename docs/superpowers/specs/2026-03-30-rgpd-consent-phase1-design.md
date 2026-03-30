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

`COMMON_IDS` est typé `Record<string, string>` dans `PlayerMapConfig.ts` — aucune modification de type nécessaire.

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
  signature?: string        // préservé si popup 1 déjà complétée
  consentAtomId?: string    // préservé si atom déjà créé
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

**Appelée depuis `PlayerMapHome`** dans le `useEffect` qui résout `playerAtomId`, uniquement si `playerAtomId` est défini (utilisateur existant). Pour un nouvel utilisateur (`playerAtomId` undefined), `consentAlreadyAccepted` reste `false` par défaut — la query n'est pas déclenchée.

### 4. `hooks/useAtomCreation.ts`

Ajouter `createConsentAtom` comme méthode interne retournée par le hook (accès à `writeConfig` nécessaire) :

```typescript
// Dans useAtomCreation, aux côtés de createAtom, createStringAtom, createEthereumAccountAtom
const createConsentAtom = async (consentJson: object): Promise<{ atomId: bigint }> => {
  if (!walletConnected || !walletAddress) throw new Error('Wallet not connected')
  const { PINATA_CONFIG } = getPinataConstants()
  const config = { ...writeConfig, pinataApiJWT: PINATA_CONFIG.JWT_KEY }
  const result = await createAtomFromIpfsUpload(config, consentJson)
  return { atomId: BigInt(result.state.termId) }
}

// Retourné dans l'objet du hook :
return { createAtom, createStringAtom, createEthereumAccountAtom, createConsentAtom }
```

### 5. `hooks/useRegisterPlayer.ts`

**Nouvelles props :**

```typescript
interface UseRegisterPlayerProps {
  // ... existant inchangé ...
  consentAlreadyAccepted?: boolean  // skip étapes signing-consent, creating-consent-atom, creating-accepted-triple
  chainId?: number                   // pour le domain EIP-712
  // Note: walletConnected existant est réutilisé pour signTypedData — pas de prop walletClient supplémentaire
}
```

**Payload EIP-712 :**

`domain` et `types` utilisent `as const` (valeurs statiques, correct pour l'inférence EIP-712). `message` **ne doit pas** utiliser `as const` car il contient `timestamp` computé dynamiquement.

```typescript
const domain = {
  name: 'Player Map',
  version: '1',
  chainId: chainId,
} as const

const types = {
  TermsAcceptance: [
    { name: 'wallet',       type: 'address' },
    { name: 'termsVersion', type: 'string' },
    { name: 'termsURI',     type: 'string' },
    { name: 'privacyURI',   type: 'string' },
    { name: 'timestamp',    type: 'string' },
    { name: 'statement',    type: 'string' },
  ],
} as const

// Pas de `as const` — timestamp est dynamique
const message = {
  wallet: walletAddress as `0x${string}`,
  termsVersion: 'v1.0',
  termsURI: 'ipfs://bafy.../terms-v1.0.pdf',    // TODO: CID réel
  privacyURI: 'ipfs://bafy.../privacy-v1.0.pdf', // TODO: CID réel
  timestamp: new Date().toISOString(),
  statement: 'I confirm that I have read and agree to the Terms of Service and Privacy Policy. I understand that blockchain records are permanent and that I am solely responsible for content I publish through this interface.',
}
```

**Signature :**

```typescript
const signature = await walletConnected.signTypedData({
  domain,
  types,
  primaryType: 'TermsAcceptance',
  message,
})
```

**Hash du message pour le JSON IPFS :**

Sérialisation déterministe : `keccak256(toBytes(JSON.stringify(message)))` (viem `keccak256` + `toBytes`).

**Nouveau flow dans `register()` :**

```
Étape 0 — signing-consent
  Skip si: consentAlreadyAccepted OU state.signature déjà présent
  → walletConnected.signTypedData(...)
  → state.signature préservé

Étape 1 — creating-consent-atom
  Skip si: consentAlreadyAccepted OU state.consentAtomId déjà présent
  → buildConsentJson(message, keccak256(toBytes(JSON.stringify(message))), signature)
  → createConsentAtom(json)
  → state.consentAtomId préservé

Étapes 2-5 — existantes, inchangées
  (creating-pseudo-atom, fetching/creating-account-atom, creating-alias-triple)

Étape 6 — creating-accepted-triple
  Skip si: consentAlreadyAccepted
  → checkTripleExists(accountAtomId, ACCEPTED, consentAtomId)
     Si existe déjà → skip silencieux (idempotent)
     Sinon → createTripleStatement(...)

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
  "message_hash": "<keccak256(toBytes(JSON.stringify(message)))>",
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

**Au chargement du formulaire** : dans le `useEffect` existant qui résout `playerAtomId`, ajouter l'appel `fetchAccountConsent` uniquement si `playerAtomId` est défini :

```typescript
if (playerAtomId && constants?.COMMON_IDS?.ACCEPTED) {
  fetchAccountConsent(playerAtomId, constants.COMMON_IDS.ACCEPTED)
    .then(({ exists }) => setConsentAlreadyAccepted(exists))
}
```

Pour un nouvel utilisateur (`playerAtomId` undefined) : `consentAlreadyAccepted` reste `false`, la query n'est pas déclenchée.

**Bouton VALIDATE désactivé si :** `isValidateDisabled || (!rgpdChecked && !consentAlreadyAccepted)`

**Dans le form, au-dessus du bouton VALIDATE :**
- Si `consentAlreadyAccepted` : afficher `✅ Terms already accepted (v1.0)`
- Sinon : checkbox obligatoire avec liens cliquables "Terms of Service" et "Privacy Policy" (nouvel onglet)

**`handleValidate`** passe `consentAlreadyAccepted` et `chainId` à `register()`. `walletConnected` est déjà dans le hook — pas de prop supplémentaire.

**`PlayerCreationProgress`** reçoit `consentAlreadyAccepted: boolean` en prop pour conditionner l'affichage des étapes.

### 7. `PlayerCreationProgress.tsx`

**`IDENTITY_STEPS`** étendu avec les nouvelles étapes dans le bon ordre.

**`IdentityProgressBar`** reçoit `consentAlreadyAccepted: boolean` en plus de `hasGuild`.

Étapes UI construites dynamiquement :

| # | Label | Condition d'affichage |
|---|-------|----------------------|
| 1 | Signature des conditions | `!consentAlreadyAccepted` |
| 2 | Preuve légale | `!consentAlreadyAccepted` |
| 3 | Username atom | toujours |
| 4 | Account | toujours |
| 5 | Alias link | toujours |
| 6 | Consentement lié | `!consentAlreadyAccepted` |
| 7 | Guild membership | `hasGuild` |

La prop `consentAlreadyAccepted` vient de `PlayerMapHome` — pas inférée de `identityStep` (pour éviter toute ambiguïté pendant un retry).

**`statusLabel`** mis à jour :
```typescript
'signing-consent':          'Signature des conditions (sans frais)...',
'creating-consent-atom':    'Enregistrement de la preuve légale...',
'creating-accepted-triple': 'Liaison du consentement...',
```

---

## Gestion d'erreurs

| Cas | Comportement |
|-----|-------------|
| Checkbox non cochée | Bouton désactivé, aucun message d'erreur |
| Signature refusée (popup 1) | `step: 'error'`, message "Signature annulée. Vous devez accepter les conditions pour continuer." Retry relance depuis `signing-consent` (`state.signature` undefined → popup re-déclenchée) |
| Transaction échouée après signature | Retry depuis l'étape échouée. `state.signature` préservé → popup 1 non redemandée |
| Consent atom déjà existant | `createAtomFromIpfsUpload` retourne l'existant — ID utilisé sans erreur |
| Triple accepted déjà existant | `checkTripleExists` détecte l'existant → skip silencieux |
| Account atom existant | Comportement existant inchangé |

---

## Checklist de livraison

- [ ] `ACCEPTED` ajouté à `COMMON_IDS` dans `utils/constants.ts` (placeholder)
- [ ] `IdentityCreationStep` étendu avec les étapes consent dans `types/alias.ts`
- [ ] `IdentityCreationState` étendu avec `signature` et `consentAtomId`
- [ ] `fetchAccountConsent` ajouté dans `api/fetchPlayerAliases.ts` (skip si playerAtomId undefined)
- [ ] `createConsentAtom` ajouté comme méthode retournée par `hooks/useAtomCreation.ts`
- [ ] `useRegisterPlayer` : nouvelles props + étapes consent + retry-safe + `as const` retiré du message
- [ ] `PlayerMapHome` : checkbox RGPD, vérification au chargement conditionnelle, bouton conditionnel
- [ ] `PlayerCreationProgress` : prop `consentAlreadyAccepted` + barre de progression 6-7 étapes
- [ ] Aucun code mort

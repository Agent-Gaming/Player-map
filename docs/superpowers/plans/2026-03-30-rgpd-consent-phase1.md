# RGPD Consent Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate RGPD consent (EIP-712 signature + on-chain proof) as the first two steps of the existing Phase 1 player identity creation flow.

**Architecture:** Extend `useRegisterPlayer` with two new leading steps (sign → consent atom) and one new trailing step (accepted triple), preserving the existing retry-safe pattern. The checkbox and consent query live in `PlayerMapHome`; the progress display is updated in `PlayerCreationProgress`.

**Tech Stack:** React, TypeScript, wagmi (`walletConnected.signTypedData`), viem (`keccak256`, `toBytes`), `@0xintuition/sdk` (`createAtomFromIpfsUpload`, `createTripleStatement`), Pinata (via `getPinataConstants()`).

---

## No test framework

This project has no configured test runner (`"test": ""`). Use TypeScript type checking as the verification step for each task:

```bash
cd Player-map && npx tsc --noEmit
```

Expected: no errors. Fix any TypeScript errors before committing.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/alias.ts` | Modify | Add consent steps to `IdentityCreationStep`; add `signature` and `consentAtomId` to `IdentityCreationState` |
| `src/utils/constants.ts` | Modify | Add `ACCEPTED` placeholder to `COMMON_IDS` |
| `src/api/fetchPlayerAliases.ts` | Modify | Add `fetchAccountConsent` query |
| `src/hooks/useAtomCreation.ts` | Modify | Add `createConsentAtom` method |
| `src/hooks/useRegisterPlayer.ts` | Modify | Add consent steps to `register()` flow + new props |
| `src/PlayerMapHome.tsx` | Modify | Add checkbox UI, consent check on load, update `handleValidate` |
| `src/PlayerCreationProgress.tsx` | Modify | Update `IdentityProgressBar` to show consent steps conditionally |

---

## Task 1: Extend types

**Files:**
- Modify: `src/types/alias.ts`

- [ ] **Step 1: Add consent steps to `IdentityCreationStep`**

In [src/types/alias.ts](src/types/alias.ts), replace the `IdentityCreationStep` type:

```typescript
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
```

- [ ] **Step 2: Add consent fields to `IdentityCreationState`**

Add two optional fields to the `IdentityCreationState` interface (after `aliasTripleId`):

```typescript
  // Preserved on error for targeted retry
  signature?: string        // set after popup 1 — not re-requested on retry
  consentAtomId?: string    // set after consent atom created — not re-created on retry
```

- [ ] **Step 3: Type-check**

```bash
cd Player-map && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd Player-map && git add src/types/alias.ts && git commit -m "feat: extend IdentityCreationStep and IdentityCreationState with consent fields"
```

---

## Task 2: Add ACCEPTED predicate constant

**Files:**
- Modify: `src/utils/constants.ts`

- [ ] **Step 1: Add ACCEPTED to COMMON_IDS**

In [src/utils/constants.ts](src/utils/constants.ts), add `ACCEPTED` to the `COMMON_IDS` object (after `IS_MEMBER_OF`):

```typescript
  ACCEPTED: '<ACCEPTED_PREDICATE_ID>', // TODO: replace with real term_id once atom is created on-chain
```

- [ ] **Step 2: Type-check**

```bash
cd Player-map && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd Player-map && git add src/utils/constants.ts && git commit -m "feat: add ACCEPTED predicate placeholder to COMMON_IDS"
```

---

## Task 3: Add fetchAccountConsent API function

**Files:**
- Modify: `src/api/fetchPlayerAliases.ts`

- [ ] **Step 1: Add the function**

In [src/api/fetchPlayerAliases.ts](src/api/fetchPlayerAliases.ts), append after the last export:

```typescript
/**
 * Queries whether an account atom has an [accepted] triple pointing to any consent atom.
 * Used at form load to skip consent steps for users who already accepted terms v1.0.
 * Returns exists: false (not called) when accountAtomId is undefined (new user).
 */
export const fetchAccountConsent = async (
  accountAtomId: string,
  acceptedPredicateId: string,
  network: Network = Network.MAINNET
): Promise<{ exists: boolean; consentAtomId?: string }> => {
  try {
    const apiUrl = API_URLS[network];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetAccountConsent($subjectId: String!, $predicateId: String!) {
            triples(
              where: {
                subject_id: { _eq: $subjectId }
                predicate_id: { _eq: $predicateId }
              }
              limit: 1
            ) {
              term_id
              object {
                term_id
              }
            }
          }
        `,
        variables: {
          subjectId: accountAtomId,
          predicateId: acceptedPredicateId,
        },
      }),
    });

    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL errors (fetchAccountConsent):', data.errors);
      return { exists: false };
    }

    const triples = data.data?.triples || [];
    if (triples.length === 0) return { exists: false };
    return {
      exists: true,
      consentAtomId: triples[0].object?.term_id,
    };
  } catch (error) {
    console.error('Error fetching account consent:', error);
    return { exists: false };
  }
};
```

- [ ] **Step 2: Type-check**

```bash
cd Player-map && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd Player-map && git add src/api/fetchPlayerAliases.ts && git commit -m "feat: add fetchAccountConsent GraphQL query"
```

---

## Task 4: Add createConsentAtom to useAtomCreation

**Files:**
- Modify: `src/hooks/useAtomCreation.ts`

- [ ] **Step 1: Import createAtomFromIpfsUpload**

In [src/hooks/useAtomCreation.ts](src/hooks/useAtomCreation.ts), add `createAtomFromIpfsUpload` to the existing SDK import:

```typescript
import {
  createAtomFromString,
  createAtomFromThing,
  createAtomFromEthereumAccount,
  createAtomFromIpfsUpload,
} from '@0xintuition/sdk';
```

Also add this import at the top:

```typescript
import { getPinataConstants } from '../utils/globalConstants';
```

- [ ] **Step 2: Add createConsentAtom method**

Inside `useAtomCreation`, add the new method alongside the existing ones (before the `return`):

```typescript
  /**
   * Creates a consent atom by uploading a JSON object to IPFS via Pinata,
   * then creating an on-chain atom pointing to that IPFS URI.
   * Requires PINATA_CONFIG.JWT_KEY to be set via setPinataConstants().
   */
  const createConsentAtom = async (consentJson: object): Promise<{ atomId: bigint }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    const pinataConstants = getPinataConstants();
    if (!pinataConstants?.PINATA_CONFIG?.JWT_KEY) {
      throw new Error('Pinata JWT not configured — call setPinataConstants() with PINATA_CONFIG');
    }
    const config = {
      ...writeConfig,
      pinataApiJWT: pinataConstants.PINATA_CONFIG.JWT_KEY as string,
    };
    console.log('[createConsentAtom] ▶ uploading consent JSON to IPFS');
    const result = await createAtomFromIpfsUpload(config, consentJson);
    console.log('[createConsentAtom] ✓ atomId:', result.state.termId, '| uri:', result.uri);
    return { atomId: BigInt(result.state.termId) };
  };
```

- [ ] **Step 3: Export from the hook**

Add `createConsentAtom` to the return object:

```typescript
  return {
    createAtom,
    createStringAtom,
    createEthereumAccountAtom,
    createConsentAtom,
  };
```

- [ ] **Step 4: Type-check**

```bash
cd Player-map && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd Player-map && git add src/hooks/useAtomCreation.ts && git commit -m "feat: add createConsentAtom method to useAtomCreation"
```

---

## Task 5: Extend useRegisterPlayer with consent steps

**Files:**
- Modify: `src/hooks/useRegisterPlayer.ts`

This is the core task. Work through it step by step.

- [ ] **Step 1: Add new imports**

In [src/hooks/useRegisterPlayer.ts](src/hooks/useRegisterPlayer.ts), add to the existing viem import:

```typescript
import { toHex, getAddress, keccak256, toBytes } from 'viem';
```

Add `createTripleStatement` to the SDK import:

```typescript
import { calculateAtomId, createTripleStatement } from '@0xintuition/sdk';
```

- [ ] **Step 2: Add new props**

Extend `UseRegisterPlayerProps`:

```typescript
  consentAlreadyAccepted?: boolean  // if true, skip signing-consent, creating-consent-atom, creating-accepted-triple
  chainId?: number                   // for the EIP-712 domain
```

Note: `walletConnected` (existing prop) is reused for `signTypedData` — no new wallet prop needed.

- [ ] **Step 3: Destructure new props in the hook**

Add to the destructuring at the top of `useRegisterPlayer`:

```typescript
  consentAlreadyAccepted,
  chainId,
```

- [ ] **Step 4: Get createConsentAtom from useAtomCreation**

The hook already calls `useAtomCreation`. Add `createConsentAtom` to the destructured result:

```typescript
  const { createAtom, createStringAtom, createEthereumAccountAtom, createConsentAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient });
```

- [ ] **Step 5: Add `_consentMessage` to IdentityCreationState**

In [src/types/alias.ts](src/types/alias.ts), add alongside `signature` and `consentAtomId`:

```typescript
  _consentMessage?: Record<string, string>  // internal — message payload preserved for atom creation retry
```

- [ ] **Step 6: Add consent steps BEFORE Step 1 (pseudo atom) in register()**

Insert this block at the very start of the `try` block in `register()`, before the existing `// Step 1 — pseudo atom` comment. The two consent blocks are split so that a retry after a failed `creating-consent-atom` skips signing but retries the atom creation:

```typescript
      // Step 0 — EIP-712 consent signature (off-chain, free — popup 1)
      let signature = state.signature;
      let consentAtomId = state.consentAtomId;
      let consentMessage: Record<string, string> | undefined;

      if (!consentAlreadyAccepted && !signature) {
        setState(s => ({ ...s, step: 'signing-consent' }));

        const domain = { name: 'Player Map', version: '1', chainId: chainId ?? 1 } as const;
        const types = {
          TermsAcceptance: [
            { name: 'wallet',       type: 'address' },
            { name: 'termsVersion', type: 'string' },
            { name: 'termsURI',     type: 'string' },
            { name: 'privacyURI',   type: 'string' },
            { name: 'timestamp',    type: 'string' },
            { name: 'statement',    type: 'string' },
          ],
        } as const;

        const message = {
          wallet: walletAddress as `0x${string}`,
          termsVersion: 'v1.0',
          termsURI: 'ipfs://bafy.../terms-v1.0.pdf',    // TODO: replace with real CID
          privacyURI: 'ipfs://bafy.../privacy-v1.0.pdf', // TODO: replace with real CID
          timestamp: new Date().toISOString(),
          statement: 'I confirm that I have read and agree to the Terms of Service and Privacy Policy. I understand that blockchain records are permanent and that I am solely responsible for content I publish through this interface.',
        };

        signature = await walletConnected.signTypedData({
          domain,
          types,
          primaryType: 'TermsAcceptance',
          message,
        });
        consentMessage = message as unknown as Record<string, string>;
        setState(s => ({ ...s, signature, _consentMessage: consentMessage }));
      } else if (state._consentMessage) {
        consentMessage = state._consentMessage;
      }

      // Step 1 — create consent atom on-chain (popup 2 begins here)
      if (!consentAlreadyAccepted && !consentAtomId && consentMessage) {
        setState(s => ({ ...s, step: 'creating-consent-atom' }));
        const messageHash = keccak256(toBytes(JSON.stringify(consentMessage)));
        const consentJson = {
          type: 'terms_acceptance',
          schema_version: '1.0',
          accepted_at: consentMessage.timestamp,
          terms_version: consentMessage.termsVersion,
          terms_uri: consentMessage.termsURI,
          privacy_uri: consentMessage.privacyURI,
          message_hash: messageHash,
          signature,
        };
        const result = await createConsentAtom(consentJson);
        consentAtomId = `0x${result.atomId.toString(16)}`;
        setState(s => ({ ...s, consentAtomId }));
      }
```

- [ ] **Step 7: Add creating-accepted-triple step AFTER creating-alias-triple**

After the existing `// Compute the alias triple vault ID` block and `setState` for `aliasTripleId`, add (before Step 4 guild):

```typescript
      // Step — [Account] — [accepted] — [Consent Atom] (skip if consent already accepted)
      if (!consentAlreadyAccepted && consentAtomId) {
        const acceptedPredicateId = constants.COMMON_IDS.ACCEPTED;
        if (!acceptedPredicateId || acceptedPredicateId.startsWith('<')) {
          throw new Error('ACCEPTED predicate ID is not configured — update COMMON_IDS.ACCEPTED');
        }
        setState(s => ({ ...s, step: 'creating-accepted-triple' }));

        // Idempotent: check if triple already exists before creating
        const alreadyExists = await checkTripleExists(
          BigInt(accountAtomId),
          BigInt(acceptedPredicateId),
          BigInt(consentAtomId),
        );
        if (!alreadyExists) {
          const writeConfig = {
            address: ATOM_CONTRACT_ADDRESS as any,
            walletClient: walletConnected as any,
            publicClient,
          };
          await createTripleStatement(writeConfig, {
            args: [BigInt(accountAtomId), BigInt(acceptedPredicateId), BigInt(consentAtomId)],
          });
        }
      }
```

Note: `checkTripleExists` is already available via the `useBatchCreateTriple` destructure at the top of the hook.

- [ ] **Step 8: Update TERMINAL steps array**

The `TERMINAL` array already includes `'idle' | 'success' | 'error'` — no change needed. The new steps are non-terminal, so `isRegistering` will be `true` during them. ✓

- [ ] **Step 9: Update reset() to clear new fields**

`reset()` calls `setState({ step: 'idle' })` which clears everything including `signature`, `consentAtomId`, `_consentMessage` since it's a full state replacement. ✓ No change needed.

- [ ] **Step 10: Type-check**

```bash
cd Player-map && npx tsc --noEmit
```

Expected: no errors. Fix any TypeScript issues (likely `_consentMessage` type, `createTripleStatement` args shape).

Check the SDK signature for `createTripleStatement`:

```bash
grep -A8 "declare function createTripleStatement" Player-map/node_modules/@0xintuition/sdk/dist/index.d.ts
```

Adjust the `args` format if needed (the SDK may use `{ subjectId, predicateId, objectId }` or `[s, p, o]` array).

- [ ] **Step 11: Commit**

```bash
cd Player-map && git add src/types/alias.ts src/hooks/useRegisterPlayer.ts && git commit -m "feat: extend useRegisterPlayer with EIP-712 consent signature and accepted triple"
```

---

## Task 6: Update PlayerMapHome — checkbox and consent check

**Files:**
- Modify: `src/PlayerMapHome.tsx`

- [ ] **Step 1: Add imports**

In [src/PlayerMapHome.tsx](src/PlayerMapHome.tsx), add to the existing imports:

```typescript
import { fetchAccountConsent } from './api/fetchPlayerAliases';
```

- [ ] **Step 2: Add new state**

After the existing form field states, add:

```typescript
  // ─── Consent state ───────────────────────────────────────────────────────────
  const [consentAlreadyAccepted, setConsentAlreadyAccepted] = useState(false);
  const [rgpdChecked, setRgpdChecked] = useState(false);
```

- [ ] **Step 3: Add consent check in the playerAtomId useEffect**

In the existing `useEffect` that handles the `playerAtomId` auto-transition (around line 101), add a consent check. The effect currently runs when `playerAtomId` is truthy. Add the consent query inside the same block, guarded by `playerAtomId` and `ACCEPTED` predicate being configured:

```typescript
  useEffect(() => {
    if (!aliasesLoading && playerAtomId && showForm && registrationPhase === 'input') {
      // existing code...
      setRegistrationPhase('loading-existing');

      // Check if this wallet already accepted terms
      const acceptedId = constants?.COMMON_IDS?.ACCEPTED;
      if (acceptedId && !acceptedId.startsWith('<')) {
        fetchAccountConsent(playerAtomId, acceptedId)
          .then(({ exists }) => setConsentAlreadyAccepted(exists))
          .catch(err => console.warn('[PlayerMapHome] consent check failed:', err));
      }
    }
  }, [playerAtomId, aliasesLoading, showForm]);
```

- [ ] **Step 4: Update isValidateDisabled**

Find the existing line:
```typescript
  const isValidateDisabled = useExistingAlias ? !selectedExistingAlias : !pseudoInput.trim();
```

Replace with:
```typescript
  const isValidateDisabled =
    (useExistingAlias ? !selectedExistingAlias : !pseudoInput.trim()) ||
    (!rgpdChecked && !consentAlreadyAccepted);
```

- [ ] **Step 5: Update handleValidate to pass consent props**

Find the existing `handleValidate` function call to `register`:

```typescript
    register(username, imageFile ?? undefined);
```

Replace with:

```typescript
    register(username, imageFile ?? undefined);
```

And update the `useRegisterPlayer` instantiation (around line 79) to pass the new props:

```typescript
  const {
    register,
    reset: resetIdentity,
    step: identityStep,
    isRegistering,
    error: identityError,
    pseudoAtomId: reg_pseudoAtomId,
    accountAtomId: reg_accountAtomId,
    aliasTripleId: reg_aliasTripleId,
  } = useRegisterPlayer(
    constants
      ? {
          walletConnected,
          walletAddress,
          constants,
          publicClient,
          guildId: selectedGuild,
          existingAccountAtomId: accountAtomId,
          consentAlreadyAccepted,
          chainId: wagmiConfig?.chainId,
        }
      : ({} as any)
  );
```

- [ ] **Step 6: Add handleBack reset for consent state**

In `handleBack`, add resets for the new state:

```typescript
    setConsentAlreadyAccepted(false);
    setRgpdChecked(false);
```

- [ ] **Step 7: Add checkbox UI in the form**

In the form, find the existing terms text block:

```tsx
                <div>
                  <p>I confirm that I have read, consent and agree to Agent Terms of Services and Privacy Policy.</p>
                </div>
```

Replace with:

```tsx
                {/* RGPD consent checkbox */}
                {consentAlreadyAccepted ? (
                  <div className={styles.consentAccepted}>
                    ✅ Terms already accepted (v1.0)
                  </div>
                ) : (
                  <div className={styles.consentRow}>
                    <label className={styles.consentLabel}>
                      <input
                        type="checkbox"
                        checked={rgpdChecked}
                        onChange={e => setRgpdChecked(e.target.checked)}
                        className={styles.consentCheckbox}
                      />
                      <span>
                        I have read and agree to the{' '}
                        <a
                          href="ipfs://bafy.../terms-v1.0.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.consentLink}
                        >
                          Terms of Service
                        </a>
                        {' '}and{' '}
                        <a
                          href="ipfs://bafy.../privacy-v1.0.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.consentLink}
                        >
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                  </div>
                )}
```

- [ ] **Step 8: Add CSS classes**

In [src/PlayerMapHome.module.css](src/PlayerMapHome.module.css), append:

```css
.consentAccepted {
  font-size: 0.875rem;
  color: #4ade80;
  margin-bottom: 0.75rem;
}

.consentRow {
  margin-bottom: 0.75rem;
}

.consentLabel {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1.4;
}

.consentCheckbox {
  margin-top: 0.15rem;
  flex-shrink: 0;
  cursor: pointer;
}

.consentLink {
  color: #818cf8;
  text-decoration: underline;
}

.consentLink:hover {
  color: #a5b4fc;
}
```

- [ ] **Step 9: Pass consentAlreadyAccepted to PlayerCreationProgress**

Find the `<PlayerCreationProgress ...>` component and add:

```tsx
                  consentAlreadyAccepted={consentAlreadyAccepted}
```

- [ ] **Step 10: Type-check**

```bash
cd Player-map && npx tsc --noEmit
```

Expected: no errors. If `PlayerCreationProgressProps` doesn't have `consentAlreadyAccepted` yet, it will error — that's expected; it gets fixed in Task 7.

- [ ] **Step 11: Commit** (after Task 7 passes type-check)

Commit together with Task 7.

---

## Task 7: Update PlayerCreationProgress — consent steps in progress bar

**Files:**
- Modify: `src/PlayerCreationProgress.tsx`

- [ ] **Step 1: Add consentAlreadyAccepted to props**

In [src/PlayerCreationProgress.tsx](src/PlayerCreationProgress.tsx), add to `PlayerCreationProgressProps`:

```typescript
  consentAlreadyAccepted?: boolean;
```

And pass it down to `IdentityProgressBar`:

In the `PlayerCreationProgress` component, find the `<IdentityProgressBar>` call and add the prop:

```tsx
        <IdentityProgressBar step={identityStep} hasGuild={hasGuild} consentAlreadyAccepted={!!consentAlreadyAccepted} />
```

- [ ] **Step 2: Update IDENTITY_STEPS**

Replace the existing `IDENTITY_STEPS` array:

```typescript
const IDENTITY_STEPS: IdentityCreationStep[] = [
  'idle',
  'signing-consent',
  'creating-consent-atom',
  'creating-pseudo-atom',
  'fetching-account-atom',
  'creating-account-atom',
  'creating-alias-triple',
  'creating-accepted-triple',
  'creating-guild-membership',
  'success',
];
```

- [ ] **Step 3: Update statusLabel**

Add the three new entries to `statusLabel`:

```typescript
const statusLabel: Partial<Record<IdentityCreationStep, string>> = {
  'signing-consent':          'Signature des conditions (sans frais)...',
  'creating-consent-atom':    'Enregistrement de la preuve légale...',
  'creating-pseudo-atom':     'Creating username atom...',
  'fetching-account-atom':    'Checking account...',
  'creating-account-atom':    'Creating account atom...',
  'creating-alias-triple':    'Creating alias link...',
  'creating-accepted-triple': 'Liaison du consentement...',
  'creating-guild-membership': 'Creating guild membership...',
};
```

- [ ] **Step 4: Update IdentityProgressBar to accept consentAlreadyAccepted**

Update the component signature:

```typescript
const IdentityProgressBar = ({
  step,
  hasGuild,
  consentAlreadyAccepted,
}: {
  step: IdentityCreationStep;
  hasGuild: boolean;
  consentAlreadyAccepted: boolean;
}) => {
```

- [ ] **Step 5: Update the uiSteps array in IdentityProgressBar**

Replace the existing `uiSteps` with a dynamically built array that omits consent steps when `consentAlreadyAccepted` is true:

```typescript
  const consentSteps = consentAlreadyAccepted ? [] : [
    {
      label: 'Signature des conditions',
      doneAfter: IDENTITY_STEPS.indexOf('signing-consent'),
      activeOn: ['signing-consent'],
    },
    {
      label: 'Preuve légale',
      doneAfter: IDENTITY_STEPS.indexOf('creating-consent-atom'),
      activeOn: ['creating-consent-atom'],
    },
  ];

  const identitySteps = [
    {
      label: 'Username atom',
      doneAfter: IDENTITY_STEPS.indexOf('creating-pseudo-atom'),
      activeOn: ['creating-pseudo-atom'],
    },
    {
      label: 'Account',
      doneAfter: IDENTITY_STEPS.indexOf('creating-account-atom'),
      activeOn: ['fetching-account-atom', 'creating-account-atom'],
    },
    {
      label: 'Alias link',
      doneAfter: IDENTITY_STEPS.indexOf('creating-alias-triple'),
      activeOn: ['creating-alias-triple'],
    },
    ...(consentAlreadyAccepted ? [] : [{
      label: 'Consentement lié',
      doneAfter: IDENTITY_STEPS.indexOf('creating-accepted-triple'),
      activeOn: ['creating-accepted-triple'],
    }]),
    ...(hasGuild ? [{
      label: 'Guild membership',
      doneAfter: IDENTITY_STEPS.indexOf('creating-guild-membership'),
      activeOn: ['creating-guild-membership'],
    }] : []),
  ];

  const uiSteps = [...consentSteps, ...identitySteps];
```

- [ ] **Step 6: Type-check**

```bash
cd Player-map && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit Tasks 6 + 7 together**

```bash
cd Player-map && git add src/PlayerMapHome.tsx src/PlayerMapHome.module.css src/PlayerCreationProgress.tsx && git commit -m "feat: add RGPD consent checkbox and progress bar to Phase 1 registration flow"
```

---

## Final verification

- [ ] **Build the project**

```bash
cd Player-map && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Manual smoke test checklist**

1. Open the form as a new user (no existing wallet data) — checkbox appears, button disabled until checked
2. Check checkbox — button enabled
3. Click Create Identity — popup 1 (EIP-712 signature), then popup 2 (transactions)
4. Cancel popup 1 — error "Signature annulée..." with Retry button; Retry re-triggers popup 1
5. Cancel popup 2 at consent atom step — Retry re-triggers popup 2 from consent atom (no popup 1 again)
6. As returning user with existing consent — checkbox replaced by ✅, flow skips steps 1 & 2
7. Confirm `ACCEPTED` placeholder in constants does not break anything when predicate not yet configured (graceful error message)

- [ ] **Final commit if any fixes needed**

```bash
cd Player-map && git add -p && git commit -m "fix: address issues from smoke test"
```

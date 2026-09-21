# Project: Proof of X — CKB-Native Attestation Primitive
## Final Hardened Specification (Week 5)

### Absolute Rules

1. Authorization MUST be enforced by the Type Script. Frontend or server code is never the authority.
2. Never invent CKB / CCC APIs. Always verify against the actual SDK version and official patterns before implementing transaction logic.
3. CKB is the only source of truth for attestation state.
4. Do not introduce an application database as the source of truth for validity.
5. Keep the MVP extremely narrow. No multi-issuer registry, no transfer, no multi-type, no social features.

---

## 1. Positioning

We are building a minimal CKB-native protocol that represents an attestation as an **owned CKB Cell** whose state transitions are enforced on-chain.

> The protocol represents an attestation as an owned CKB Cell whose state transitions are enforced on-chain.

This is **not** a universal credential platform or identity system.

MVP focuses on one concrete use case only:  
**Proof of Contribution**

---

## 2. Roles

- **Issuer**: The single authorized party that can create and revoke attestations.
- **Holder**: Owner of the attestation Cell (determined by Lock Script).
- **Verifier**: Anyone who can independently verify the current state of an attestation using only on-chain data.

---

## 3. State Machine

```
NONE
  │ issue (only by authorized issuer)
  ▼
VALID
  │ revoke (only by authorized issuer)
  ▼
REVOKED
```

Rules:
- After REVOKED, the attestation can never return to VALID.
- Transfer is out of scope.
- All transitions must be validated by the Type Script.

---

## 4. Authorization Model (MVP)

- There is **one fixed authorized issuer** for the entire MVP.
- The Type Script args contain a fixed `issuer_lock_hash`.
- Only a transaction that proves control of that lock hash may:
  - Issue a new attestation
  - Perform the VALID → REVOKED transition
- The Type Script args containing `issuer_lock_hash` **MUST remain unchanged** across the VALID → REVOKED transition.
- Never implement authorization by checking a wallet address in frontend or server code.

---

## 5. On-chain Data Model (Simplified for Week 5)

To avoid off-chain dependency for verification, we store the claim in plaintext on-chain with a strict length limit.

```ts
interface OnChainAttestationData {
  version: 1;
  attestation_id: Hex;           // stable identifier that survives revoke
  type: "contribution";          // fixed
  claim: string;                 // short plaintext, max ~120 characters
  evidence?: string;             // optional short URL, max ~150 characters
  issued_at: number;             // block number preferred or unix timestamp
  status: 0 | 1;                 // 0 = valid, 1 = revoked
  revoked_at?: number;
}
```

Rules:
- `attestation_id` must be deterministic and stable across state transitions.
- `claim` and `evidence` must be short and non-PII.
- During revoke, the Type Script must ensure these fields remain unchanged:
  - `attestation_id`
  - `type`
  - `claim`
  - `evidence`
  - `issuer_lock_hash` (in Type Script args)
  - `holder` (Lock Script)
- Only `status` and `revoked_at` may change.

---

## 6. Cell Lifecycle

### Issue
- Create a new Cell
- Lock Script = Holder
- Type Script = Attestation Type (args contain fixed `issuer_lock_hash`)
- Data = OnChainAttestationData with `status = 0`
- Generate a stable `attestation_id` at creation time (deterministic hash from first input OutPoint)

### Revoke
- Consume the current VALID Cell
- Create a new Cell representing the REVOKED state
- Preserve `attestation_id`, `claim`, `evidence`, `holder`, and `issuer` authorization
- Update only `status` (`1`) and `revoked_at`
- Type Script must validate the transition

### Discovery
Verifier must resolve:

```
attestation_id → current live Cell → verify state
```

Do not rely only on a historical outpoint.  
After revoke, the old outpoint is consumed; the system must be able to find the latest Cell that carries the same `attestation_id`.

---

## 7. Verification Requirements

The `/verify/[id]` page must perform and clearly display these checks:

1. Latest live Cell for this `attestation_id` exists
2. Type Script is the expected attestation type
3. Type Script args contain the expected `issuer_lock_hash`
4. Lock Script matches the claimed holder
5. `claim` and `evidence` match the on-chain data
6. `status` is VALID (or clearly show REVOKED)
7. Immutable fields remained consistent

Show exact pass/fail reasons with on-chain references (transaction, cell, issuer, holder).

---

## 8. Technical Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + Lucide Icons + clean modern components
- CCC (`@ckb-ccc/core`, `@ckb-ccc/connector-react`) + JoyID / Injected / Key as wallet path
- CKB Testnet (Pudge)
- Use only real, currently supported CCC / CKB patterns

---

## 9. UI Scope (Strict)

Only these pages:

### `/`
Very short explanation of the primitive + two CTAs: Issue Proof / Verify a Proof

### `/issue`
Form:
- Holder address
- Claim (short text)
- Evidence (optional short URL)
- Issue button
Clear loading, error, and success states with transaction hash and link to the attestation.

### `/attestations/[id]`
Holder view:
- Claim
- Issuer
- Holder
- Evidence
- Issued time
- Status (VALID / REVOKED)
- Share proof link
- Direct Revoke button (active only if connected wallet is Issuer)

### `/verify/[id]`
Most important page.  
Structured, rigorous verification result with individual checks and on-chain references.

---

## 10. Non-Goals

- No multi-issuer registry
- No multiple attestation types
- No transfer
- No social features
- No token
- No application database as source of truth
- No complex dashboard

---

## 11. Implementation Order (Mandatory)

1. Define types and encoding/decoding of OnChainAttestationData
2. Define how `attestation_id` is generated and remains stable
3. Confirm Type Script authorization and transition rules
4. Implement Issue transaction using real CCC APIs
5. Implement Revoke transaction
6. Implement latest-Cell discovery by `attestation_id`
7. Implement pure verification logic
8. Only then build the UI pages

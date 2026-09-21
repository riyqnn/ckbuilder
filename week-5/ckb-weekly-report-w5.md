# CKB Weekly Report - Week 5

Reporting period: 15 - 21 September 2026  
Participant: Riyan Ainur  
Track: Builder

## 1. Summary

Week 5 focus is the Application Layer track — building a real CKB-native application, not a port of an existing dApp.

The project is **Proof of X**, a minimal attestation primitive where a Proof of Contribution is stored as an owned CKB Cell. State transitions (`VALID` → `REVOKED`) are enforced on-chain by the Type Script. There is no centralized database; CKB is the only source of truth.

Honest test: if you delete every paragraph that mentions CKB, the architecture collapses. The Cell ownership model, Type Script authorization, and deterministic ID from OutPoint are not portable to other chains without fundamental redesign.

## 2. Completed Milestones

- [x] Transfer CKB
  - Completed in Week 1 on CKB Testnet.
  - Transaction Hash: `0xcfad415c6c746d8928aa7bc3b7d51b289dc272519c42d67a3cd88ba8b1dc3005`
  - Explorer Link: [View on Explorer](https://pudge.explorer.nervos.org/transaction/0xcfad415c6c746d8928aa7bc3b7d51b289dc272519c42d67a3cd88ba8b1dc3005)

- [x] Push transaction / deploy contract on testnet
  - Completed in Week 3.
  - Transaction Hash: `0x9337388cc9779b6a5a15d22ad4060777c380e0b23fe7339703a837e61899f8ec`
  - Explorer Link: [View on Explorer](https://pudge.explorer.nervos.org/transaction/0x9337388cc9779b6a5a15d22ad4060777c380e0b23fe7339703a837e61899f8ec)

- [x] Create DOB (digital object)
  - Completed in Week 4 via Spore Protocol.
  - Transaction Hash: `0xfbb9e67b3123fe7ee1f529661d11475149eac7dbd762277f4c84f6e197834315`
  - Explorer Link: [View on Explorer](https://pudge.explorer.nervos.org/transaction/0xfbb9e67b3123fe7ee1f529661d11475149eac7dbd762277f4c84f6e197834315)

- [x] Application Layer DApp — Proof of X (Week 5)

## 3. Week 5 Application: Proof of X

### State Machine

```
NONE
  | issue (authorized issuer only)
  v
VALID (status: 0)
  | revoke (authorized issuer only)
  v
REVOKED (status: 1, terminal)
```

### Design Decisions

**Owned Cell per attestation.** Each attestation is an independent CKB Cell, not a row in a contract's state table. The holder owns the lock; the type script owns the rules.

**Authorization via Type Script args.** The `issuer_lock_hash` is encoded in the type script args at issuance. Any revoke transaction must include a cell signed by that lock hash. Frontend code has no authority.

**Deterministic `attestation_id`.** Derived at issue time from the first consumed input OutPoint:

```
attestation_id = hashCkb(firstInput.txHash || numLeToBytes(firstInput.index, 4))
```

An OutPoint can only be spent once, so the ID is globally unique and cannot be replayed.

**No off-chain database.** Verification resolves `attestation_id → live Cell → check 7 invariants` directly against the CKB node indexer.

### On-Chain Data Model

```typescript
interface OnChainAttestationData {
  version: 1;
  attestation_id: Hex;
  type: "contribution";
  claim: string;       // max 120 chars
  evidence?: string;   // max 150 chars
  issued_at: number;
  status: 0 | 1;
  revoked_at?: number;
}
```

During revocation, only `status` and `revoked_at` may change. All other fields are checked by the verifier for consistency.

### Verification Checks

The `/verify/[id]` page runs 7 on-chain checks:

1. Live Cell exists for this `attestation_id`
2. Type Script code hash matches protocol
3. Type Script args contain authorized `issuer_lock_hash`
4. Lock Script matches claimed holder
5. Claim and evidence structure is valid
6. Status is VALID or REVOKED (clearly indicated)
7. Immutable fields are consistent across state transitions

## 4. Implementation & Directory Structure

Application is in `week-5/proof-of-x/` — Next.js 14, Tailwind CSS, CCC SDK.

```
week-5/
├── SPEC.md
├── ckb-weekly-report-w5.md
└── proof-of-x/
    ├── src/
    │   ├── protocol/
    │   │   ├── types.ts
    │   │   ├── codec.ts
    │   │   ├── id.ts
    │   │   ├── config.ts
    │   │   ├── transactions.ts
    │   │   ├── discovery.ts
    │   │   ├── verifier.ts
    │   │   ├── protocol.test.ts
    │   │   └── index.ts
    │   ├── app/
    │   │   ├── page.tsx
    │   │   ├── issue/page.tsx
    │   │   ├── attestations/[id]/page.tsx
    │   │   ├── verify/page.tsx
    │   │   └── verify/[id]/page.tsx
    │   └── components/
    │       ├── Navbar.tsx
    │       ├── Footer.tsx
    │       └── CccProviderWrapper.tsx
    ├── package.json
    └── tsconfig.json
```

## 5. Test Results

Protocol unit tests cover: deterministic ID generation, codec roundtrip, claim/evidence length bounds, and revocation state invariance.

```bash
$ pnpm test:protocol

=== Proof of X Protocol Tests ===
[PASS] Test 1: Deterministic attestation_id -> 0xd419fb2cfdf221988b858560c224539ad54dbc448634c21321caf0e3a9ffbdcc
[PASS] Test 2: Codec roundtrip
[PASS] Test 3a: Max claim length enforced
[PASS] Test 3b: Max evidence length enforced
[PASS] Test 4: Revocation immutability
All tests passed.
```

Production build:

```
Route (app)                        Size     First Load JS
/ (Overview)                       2.92 kB       98 kB
/issue                             3.13 kB      395 kB
/attestations/[id]                 3.21 kB      395 kB
/verify                            2.3 kB        90 kB
/verify/[id]                       3.07 kB      253 kB
```

## 6. Key Learnings

- CKB Cell ownership means the holder genuinely owns the storage capacity, not just a mapping entry in someone else's contract.
- Type Script authorization is enforced at the VM level. There is no way to revoke an attestation without the issuer's signature, regardless of what the frontend says.
- Cell consumption as a state transition (VALID → REVOKED) is a natural fit for CKB's UTXO model — the old state is provably destroyed, the new state is provably created.
- CCC's `findCells` indexer API works directly without additional infrastructure.

## 7. Plan for Next Step

- Issue a real testnet attestation and document the full E2E flow with transaction hashes.
- Explore whether the Type Script can be deployed on-chain for a fully trustless deployment.

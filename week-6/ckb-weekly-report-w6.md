# CKB Weekly Report - Week 6

Reporting period: 22 - 28 September 2026  
Participant: Riyan Ainur  
Track: Builder

## 1. Summary

Week 5 shipped Proof of X with a claim in its own spec: *"Authorization MUST be enforced by the Type Script."* That was not true of the code — no Type Script existed, so `config.typeScriptCodeHash` held a placeholder and nothing on-chain enforced anything.

Week 6 closed that gap: wrote the Type Script, tested it, deployed it to CKB Testnet (Pudge), and ran a real issue and revoke against it. Two new handbook topics came out of the work itself: **Molecule serialization** and the **CKB Debugger**.

- **Live Demo:** [https://ckbuilder.vercel.app/](https://ckbuilder.vercel.app/)

## 2. Completed Milestones

Carried from earlier weeks:

- [x] Transfer CKB (Week 1) — [`0xcfad415c...`](https://pudge.explorer.nervos.org/transaction/0xcfad415c6c746d8928aa7bc3b7d51b289dc272519c42d67a3cd88ba8b1dc3005)
- [x] Deploy contract on testnet (Week 3) — [`0x9337388c...`](https://pudge.explorer.nervos.org/transaction/0x9337388cc9779b6a5a15d22ad4060777c380e0b23fe7339703a837e61899f8ec)
- [x] Create DOB via Spore (Week 4) — [`0xfbb9e67b...`](https://pudge.explorer.nervos.org/transaction/0xfbb9e67b3123fe7ee1f529661d11475149eac7dbd762277f4c84f6e197834315)
- [x] Application Layer DApp — Proof of X (Week 5)

New this week:

- [x] Deployed the Proof of X Type Script to CKB Testnet
  - Transaction Hash: `0x75f75dfb1ec059c3b815469d389e06056def390d7d9d5855484055593c09f7cc`
  - Status: Committed on-chain (block `0x1586d37`)
  - Code Hash: `0x98d78fa7216b17ef9501a6ee7dff98a8a9f2ea05b04a593a6ff84782ea5b55ff`, hash type `data2`
  - Cell: 3,648 CKB capacity, 3,587 bytes of bytecode
  - Explorer Link: [View on Explorer](https://pudge.explorer.nervos.org/transaction/0x75f75dfb1ec059c3b815469d389e06056def390d7d9d5855484055593c09f7cc)

- [x] Issued a real attestation against the deployed script
  - `attestation_id`: `0x566b1be767bed8dfb116cfb966b0a5c585b91ee13e6c9780cf759ac6557437b4`
  - Transaction Hash: `0x88b576598687120bd0199411fd27632ba60bc42d91987378e99fb6579883ab84`
  - Explorer Link: [View on Explorer](https://pudge.explorer.nervos.org/transaction/0x88b576598687120bd0199411fd27632ba60bc42d91987378e99fb6579883ab84)

- [x] Revoked that attestation on-chain
  - Transaction Hash: `0xa5214be149e8afba96adf5f3680f43b6af402956cbd16a2d4d2eedd9add0e2e0`
  - Explorer Link: [View on Explorer](https://pudge.explorer.nervos.org/transaction/0xa5214be149e8afba96adf5f3680f43b6af402956cbd16a2d4d2eedd9add0e2e0)

## 3. The Type Script

Code in `week-6/pox-type/`, written in TypeScript and compiled to ckb-js-vm bytecode with the same toolchain as `hello-world` in Weeks 2 and 3.

Type script args are 67 bytes. ckb-js-vm reads the first 35 to find the bytecode it should run; the last 32 are the authorized issuer's lock hash:

```
0x0000 | pox_code_hash (32) | hash_type (1) | issuer_lock_hash (32)
\____/   \________________________________/   \__________________/
flags       consumed by ckb-js-vm                read by the script
```

The script counts the cells in its own group and dispatches on the shape:

| Shape | Path | Rules |
|---|---|---|
| 0 in, 1 out | issue | issuer-signed; `status = VALID`, `revoked_at = 0`, claim and evidence in bounds; `attestation_id == hashCkb(input[0].outPoint)` |
| 1 in, 1 out | revoke | issuer-signed; `VALID -> REVOKED` with `revoked_at != 0`; every other byte unchanged; holder lock and capacity preserved |
| 1 in, 0 out | burn | issuer-signed |
| anything else | rejected | |

Each rejection has its own exit code (`1` encoding, `2` args length, `3` unauthorized, `5` bad `attestation_id`, `7` immutable field changed, `8` holder or capacity changed, `9` bad shape), so tests can assert *why* a transaction was refused.

Authorization is one check: some input cell must be unlocked by the issuer's lock hash. The issuer's cells enter the transaction anyway to pay capacity and fees, so nothing extra is needed — but the frontend cannot fake it, because the comparison happens inside the VM against a value fixed in the args at issue time.

Deployed **without** `--type-id`, so the code hash is the data hash of the bytecode and the rules are fixed for the life of every cell referencing them — a Type ID deployment would let the issuer rewrite validation rules after attestations already exist. Rebuilding from source reproduces the deployed code hash.

### What Week 5 had wrong

| Problem | Fix |
|---|---|
| `typeScriptCodeHash` was `0x546573746e65...` — ASCII for `"TestnetProofOfXTypeScriptCodeHas"` | Real ckb-js-vm code hash plus the deployed bytecode's code hash |
| `authorizedIssuerLockHash` held the Week 3 deploy **transaction hash**, not a lock hash | Actual lock hash `0x7de82d61a7eb...` |
| Type script built as `new Script(codeHash, hashType, issuerLockHash)` | `buildAttestationTypeScript()` assembles the 67-byte ckb-js-vm args |
| No `cellDeps`, so the script could never have been located | Both the ckb-js-vm cell and the bytecode cell added to every transaction |
| Cell discovery searched by `prefix` with empty args | Exact match on the full type script |
| Verifier check 2 compared only the outer code hash, which any ckb-js-vm script passes | Checks the outer hash **and** that the args name the Proof of X bytecode |
| JSON payload grew on revoke while capacity stayed fixed | Molecule, fixed length (section 4) |

There is now a test whose only job is to fail if either placeholder value comes back.

## 4. New Learning: Molecule and CKB Debugger

### Molecule fixed a real bug

Week 5 stored cell data as JSON. `JSON.stringify` omits `revoked_at` while it is `undefined`, so one attestation was **269 bytes as VALID and 293 bytes as REVOKED**. Issue sized the cell at exactly the VALID payload, and revoke preserves capacity — so every revoke would have held 430 CKB against the 454 CKB required and been rejected. It was never observed because no attestation had ever been issued.

Rewritten as a Molecule table (`week-6/pox-type/schema/pox.mol`), with `revoked_at` always present as a `Uint64` that is `0` while VALID:

```
table AttestationData {
    version:        byte,     // = 1
    attestation_id: Byte32,
    kind:           byte,     // 0 = contribution
    status:         byte,     // 0 = VALID, 1 = REVOKED
    issued_at:      Uint64,
    revoked_at:     Uint64,   // 0 while VALID
    claim:          String,
    evidence:       String,
}
```

Every field is fixed-size or a length-prefixed byteVec, so all offsets but the last are constant and an attestation encodes to the same length whether VALID or REVOKED. The capacity bug then disappears as a side effect rather than being patched, and "every immutable field is unchanged" becomes three byte-range comparisons — before `status`, `issued_at`, and from `claim` onward — where no field can be left out by accident.

The schema is implemented twice: with `mol` from `@ckb-ccc/core` in the dApp, and by hand in the script. The mock tests encode with the dApp's codec and let the script decode it inside CKB-VM, so each passing test is a cross-implementation check.

### An SDK import has a price in CKB

The first working script imported `HighLevel` and `mol` from `@ckb-js-std/core`, which is what the examples do. It compiled to 29,810 bytes — a **29,810 CKB** code cell, against an 11,810 CKB balance. The script was not too slow. It was unaffordable.

I measured each import against a bundle loading only `@ckb-js-std/bindings`:

| Imports | Bundle | Bytecode | Code cell |
|---|---|---|---|
| `HighLevel` + `mol` | 23,243 B | 29,810 B | ~29,810 CKB |
| `mol` only | 10,988 B | 15,319 B | ~15,319 CKB |
| `bindings` + `hashCkb`, hand-written reader | 2,838 B | **3,587 B** | **3,648 CKB** |

`HighLevel` alone is about 21.5 KB: its module pulls in the whole entity layer (`CellOutput`, `CellInput`, `Transaction`, `WitnessArgs`, `Header`) no matter which function you call, and esbuild cannot tree-shake it. Replacing it with the raw `bindings` calls it wraps costs about twenty lines and saves roughly 26,000 CKB.

On most platforms an unused dependency costs build size. Here it costs capacity, permanently, in the cell holding the script.

### CKB Debugger

Ran the tests against native `ckb-debugger` 1.1.1, which reports cycles per execution. To read the numbers I needed a baseline, so I put the Week 2 `hello-world` script — load script, log, exit — through the same harness:

| Script execution | Cycles |
|---|---|
| `hello-world` (ckb-js-vm baseline) | 3,957,269 |
| pox-type, burn | 4,234,180 |
| pox-type, issue | 4,506,808 |
| pox-type, revoke | 5,295,419 |
| always-success lock (native RISC-V, for scale) | 539 |

So ~3.96M cycles are ckb-js-vm starting up; my validation logic is 0.28M–1.34M on top, with revoke costing most because it parses two payloads.

The last row is the interesting one: a native lock runs in 539 cycles, so the JavaScript interpreter costs about 7,300× that before executing a line of my code. That is the concrete version of the argument for Rust the handbook makes in the abstract. For this MVP the trade was still worth it — the interpreter is what let me write and iterate on the validator in one week.

## 5. Test Results

14 cases against the native ckb-debugger, all passing.

Accepted: issue by the issuer, revoke by the issuer, burn a revoked cell.

Rejected, each asserting a specific exit code so a failure means the script refused it *for that reason* and not for some unrelated malformed-transaction reason: revoke without the issuer (`3`), burn without the issuer (`3`), `attestation_id` not derived from input 0 (`5`), revoke rewriting the claim (`7`), revoke moving the cell to another holder (`8`), revoke skimming capacity (`8`), non-canonical cell data (`1`), two attestations in one group (`9`).

Encoding: `VALID` and `REVOKED` same length, pinned cross-implementation hex vector, roundtrip through the dApp codec.

DApp side, `pnpm test:protocol` — 8 passing: deterministic `attestation_id`, Molecule roundtrip, claim and evidence bounds in UTF-8 bytes, revocation immutability, the `VALID`/`REVOKED` length invariant, immutable byte ranges across `VALID -> REVOKED`, 67-byte type script args, and no placeholders left in config.

End-to-end against the deployed script (`pnpm test:e2e`), driving the same protocol modules the UI calls:

```
[1] issue
  attestation_id : 0x566b1be767bed8dfb116cfb966b0a5c585b91ee13e6c9780cf759ac6557437b4
  cell capacity  : 358 CKB
  data bytes     : 197
  cellDeps       : 3
  tx hash        : 0x88b576598687120bd0199411fd27632ba60bc42d91987378e99fb6579883ab84

--- after issue: status=VALID isValid=true ---   all 7 checks PASS

[2] revoke
  data bytes     : 197
  tx hash        : 0xa5214be149e8afba96adf5f3680f43b6af402956cbd16a2d4d2eedd9add0e2e0

--- after revoke: status=REVOKED ---   all 7 checks PASS
  Attestation is REVOKED on-chain (revoked_at: 1790644710)
```

Both payloads are 197 bytes — the length invariant holding on real data, which is exactly what JSON could not do.

## 6. Key Learnings

- **Script bytes are capacity.** An import that costs build size elsewhere costs permanently locked CKB here: 29,810 CKB with `HighLevel`, 3,648 CKB without. The most concrete thing I have learned about CKB so far.
- **A script group is keyed on the full script hash, args included.** This removed a check I had planned: a cell cannot move to a different `issuer_lock_hash` inside one group. A transaction rewriting the args splits into two groups instead — the old one takes the burn path, the new one the issue path — so args immutability is structural.
- **Canonical encoding is a security property.** Fixed offsets are what make immutability expressible as three byte comparisons instead of a field-by-field check with a silent hole in it.
- **A Type Script cannot see time.** `issued_at` and `revoked_at` are issuer-attested, not chain-proven; without a header dep the script can only check that `revoked_at` is `0` while VALID and non-zero once REVOKED. Week 5 wrote "block number preferred or unix timestamp" without noticing only one of those is verifiable.
- **Deriving `attestation_id` from an OutPoint is checkable on-chain.** The script recomputes `hashCkb(input[0].outPoint)` and rejects a mismatch, so the identifier is enforced rather than conventional. An OutPoint can be spent once, which is what makes it unforgeable.

## 7. Challenges & Resolutions

- **The first working script could not be deployed.** 29,810 bytes against an 11,810 CKB balance. Resolved by dropping `HighLevel` and `mol` for raw `bindings` plus a hand-written Molecule reader, down to 3,587 bytes. Found by building a probe bundle per import instead of guessing which was heavy.
- **The capacity-skim test passed when it should have failed.** ccc's `JsonRpcTransformers.transactionFrom` silently raises an under-capacitated output to its occupied minimum, so my 200 CKB output became 326 CKB before reaching the debugger and the script had nothing to reject. The test only became meaningful with both capacities above the cell's occupied size. Found by dumping the transaction the harness actually passes to ckb-debugger rather than trusting the values I had set.
- **`String.length` is the wrong bound for cell data.** It counts UTF-16 units, so a 61-character claim of two-byte characters is 122 bytes on-chain and would have slipped past the 120-byte limit. Codec and script now count UTF-8 bytes, with a test for it.
- **Writing this report corrected my own analysis.** I had recorded that a 150 CKB capacity floor was masking the JSON growth bug. Working the arithmetic out showed the floor never applied at these payload sizes — revoke would have been rejected outright. The mistake was assuming instead of computing.

## 8. Plan for Next Step

- Prove authorization negatively **on-chain**, not only in the mock harness: fund a second testnet key and record the rejected revoke transaction. Current evidence is ckb-debugger exit codes — rigorous, but not an on-chain artifact.
- Replace issuer-attested timestamps with a header dep the script can verify, and measure the cycle cost.
- Port the validator to Rust with `ckb-script-templates` and compare bytecode size and cycles against the 3,587 bytes and ~4.5M cycles recorded here.
- Let the holder burn a REVOKED cell to reclaim their own capacity. Today only the issuer can, so the holder's capacity is released at someone else's discretion.

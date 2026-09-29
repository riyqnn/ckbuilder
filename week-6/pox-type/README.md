# pox-type

The Proof of X attestation Type Script, written in TypeScript and compiled to
ckb-js-vm bytecode. Deployed to CKB Testnet (Pudge) in Week 6.

| | |
|---|---|
| Code hash | `0x98d78fa7216b17ef9501a6ee7dff98a8a9f2ea05b04a593a6ff84782ea5b55ff` |
| Hash type | `data2` (no Type ID, so the rules cannot be swapped out) |
| cellDep | `0x75f75dfb1ec059c3b815469d389e06056def390d7d9d5855484055593c09f7cc#0`, `code` |
| Deploy tx | [`0x75f75dfb...`](https://pudge.explorer.nervos.org/transaction/0x75f75dfb1ec059c3b815469d389e06056def390d7d9d5855484055593c09f7cc) |
| Bytecode | 3,587 bytes (3,648 CKB cell) |

## What it enforces

Type script args are 67 bytes: `0x0000 | pox_code_hash (32) | hash_type (1) |
issuer_lock_hash (32)`. ckb-js-vm consumes the first 35; the script reads the
issuer lock hash from the rest.

Counted over this script's own group:

| Shape | Path | Rules |
|---|---|---|
| 0 in, 1 out | issue | issuer-signed; `status = VALID`, `revoked_at = 0`, bounds on claim and evidence; `attestation_id == hashCkb(input[0].outPoint)` |
| 1 in, 1 out | revoke | issuer-signed; `VALID -> REVOKED` with `revoked_at != 0`; all other bytes unchanged; holder lock and capacity preserved |
| 1 in, 0 out | burn | issuer-signed |
| anything else | rejected | |

Exit codes: `1` encoding, `2` args length, `3` unauthorized, `4` bad issue,
`5` bad attestation_id, `6` bad transition, `7` immutable field changed,
`8` holder or capacity changed, `9` unsupported shape.

## Build and test

```bash
pnpm install
pnpm build      # dist/pox-type.bc
pnpm test:only  # 14 cases, native ckb-debugger
```

`dist/` is not committed. Rebuilding from source reproduces the deployed data
hash above, since the deployment used no Type ID.

Deploy (spends testnet CKB):

```bash
offckb deploy --network testnet --target dist/pox-type.bc \
  --output ./deployment --privkey-file <key> -y
```

## Notes

- Cell data layout lives in `schema/pox.mol`, implemented twice: here in
  `contracts/pox-type/src/schema.ts`, and in the dApp in
  `week-5/proof-of-x/src/protocol/codec.ts`. The test fixtures encode with the
  dApp's codec and the script decodes with this one, so each passing test is a
  cross-implementation check run inside CKB-VM.
- `issued_at` and `revoked_at` are issuer-attested, not chain-proven. A Type
  Script cannot read wall-clock time without a header dep.

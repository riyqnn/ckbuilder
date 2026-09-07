# CKB Weekly Report - Week 3

Reporting period: 2 - 7 September 2026  
Participant: Riyan Ainur  
Track: Builder  

## 1. Summary

The goal of Week 3 was to deploy the `hello-world` ckb-js-vm contract from Week 2 to CKB Testnet (Pudge) and verify it on-chain. Short consolidation week: no new contract logic was written.

## 2. Completed This Week

### Testnet Deployment
- Deployed `dist/hello-world.bc` to CKB Testnet using:
  ```bash
  offckb deploy --network testnet --target dist/hello-world.bc --output ./deployment --privkey-file <key> -y
  ```
- Verified the deployer balance first (~2551 CKB, enough for the ~1305 CKB bytecode cell).
- Confirmed the transaction is committed via `get_transaction` on `https://testnet.ckb.dev`.

### Deployment Artifacts
- `deployment/testnet/hello-world.bc/deployment.toml`
- `deployment/testnet/hello-world.bc/migrations/2026-09-07-203623.json`
- `deployment/scripts.json` testnet section populated with code hash and cellDep.

### Reports
- Wrote and finalized the Week 2 report (`week-2/ckb-weekly-report-w2.md`) with the testnet results.

## 3. Practical Results

Contract bytecode deployed and committed on CKB Testnet (Pudge).

- Transaction Hash: `0x9337388cc9779b6a5a15d22ad4060777c380e0b23fe7339703a837e61899f8ec`
- Network: CKB Testnet (Pudge)
- Status: Committed on-chain (block `0x154e394`)
- Contract Code Hash: `0x68e6c55c513149a84bfb1d733cefda13cc8189a8cca2744e7487a6ce4167c0b2` (same as devnet — same bytecode, same data hash)
- Hash Type: `data2`, depType `code`
- Cell Capacity: 1366 CKB (1305 CKB occupied)
- Explorer Link: [View Transaction on Explorer](https://pudge.explorer.nervos.org/transaction/0x9337388cc9779b6a5a15d22ad4060777c380e0b23fe7339703a837e61899f8ec)

## 4. Key Learnings & Technical Notes

- Devnet tx hashes are not searchable on the testnet explorer; each network needs its own deployment.
- With `data2` hash type, the same `.bc` file produces the same `codeHash` on devnet and testnet; only the cellDep outPoint differs.
- `offckb deploy` options: `--privkey-file` keeps the key out of shell history, `-y` skips the confirmation prompt, and offckb waits for commitment before writing artifacts.

## 5. Challenges & Resolutions

- Devnet deployment tx (`0x717f98eb...`) returned "did not match any record" on the Pudge explorer. Fixed by performing a real testnet deployment, producing the committed tx `0x9337388c...`.
- `offckb deploy` aborted on the interactive confirmation prompt in a non-interactive shell. Fixed with `-y` + `--privkey-file`.

## 6. Plan for Week 4

- Add real logic to the contract (read/validate cell data) and test with ckb-testtool before redeploying.
- Invoke the deployed testnet contract via CCC, like `hello-world.devnet.test.ts` but on Pudge.
- Start the Rust script track with ckb-script-templates.

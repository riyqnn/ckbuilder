# CKB Weekly Report - Week 2

Reporting period: 26 August - 1 September 2026  
Participant: Riyan Ainur  
Track: Builder  

## 1. Summary

The goal of Week 2 was to write and deploy an actual CKB smart contract. Instead of jumping straight to Rust, I used the CKB JavaScript VM (ckb-js-vm) to write a contract in TypeScript, compiled it to bytecode, and deployed it with offckb.

## 2. Completed This Week

### Smart Contract Development with ckb-js-vm
- Set up the `quick-start` project with `@ckb-js-std/bindings` and `@ckb-js-std/core`.
- Wrote the `hello-world` contract in TypeScript (`contracts/hello-world/src/index.ts`): loads the script via `bindings.loadScript()`, logs it, exits with `bindings.exit(0)`.
- Built with esbuild into `dist/hello-world.js`, then compiled to bytecode `dist/hello-world.bc`.

### Deployment
- Deployed `hello-world.bc` to the local devnet with `offckb deploy --network devnet`.
- Artifacts generated in `deployment/`: `scripts.json`, `deployment.toml`, migration records.

### Testing
- Mock test (`hello-world.mock.test.ts`): deploys the bytecode into a `ckb-testtool` Resource and verifies execution with `Verifier`.
- Devnet test (`hello-world.devnet.test.ts`): builds and sends a transaction via CCC (`ccc.ClientPublicTestnet`, `ccc.SignerCkbPrivateKey`) against the offckb devnet RPC.

### Repository Organization
- Restructured the repo into per-week folders: `week-1/`, `week-2/` (commit `932e00b`).

## 3. Practical Results

Deployed the `hello-world` contract bytecode to the local devnet and ran both test suites.

- Deployment Tx Hash: `0x717f98ebdc961a4a5daa2cdbff938c38a5e39f2260c73ba36f738c56916ae974` (index 0, depType `code`)
- Network: local devnet via offckb (proxy RPC `127.0.0.1:28114`)
- Contract Code Hash: `0x68e6c55c513149a84bfb1d733cefda13cc8189a8cca2744e7487a6ce4167c0b2`
- Hash Type: `data2`
- Occupied Capacity: 1305 CKB
- Mock test: `verifier.verifySuccess()` passes
- Devnet test: transaction sent successfully to the local node

## 4. Key Learnings & Technical Notes

- Two-layer script model of ckb-js-vm: the type script points to the `ckb_js_vm` system script, and the JS bytecode cell is referenced via its args: `0x0000` + contract `codeHash` + `hashType` byte + zero padding.
- cellDeps for a JS contract must include both the ckb-js-vm script and the contract bytecode cell.
- offckb workflow: `offckb node` for devnet, `offckb deploy` for deployment, proxy RPC on port 28114.
- CCC in practice: `ClientPublicTestnet`, `SignerCkbPrivateKey`, `KnownScript` registry loaded from `system-scripts.json`.

## 5. Challenges & Resolutions

- Understanding how a JS contract is invoked on-chain took time; resolved by tracing `mainScript.args` construction in the devnet test and the `ckb_js_vm` entry in `system-scripts.json`.
- CCC client setup for devnet required pointing at the offckb proxy port with the raw node port as fallback.

## 6. Plan for Week 3

- Deploy the contract to CKB Testnet (Pudge) and record the on-chain transaction hash.
- Extend the contract with real logic reading inputs/outputs.
- Start the Rust script track with ckb-script-templates.

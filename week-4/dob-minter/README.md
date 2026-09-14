# Week 4 DOB Minter

Basic application scaffold for minting a DOB (digital object) on CKB Testnet using Spore Protocol.

## Status

DOB mint transaction sent on CKB Testnet (Pudge).

- Transaction Hash: `0xfbb9e67b3123fe7ee1f529661d11475149eac7dbd762277f4c84f6e197834315`
- Status: committed on-chain in block `0x15600b9`
- Explorer: <https://pudge.explorer.nervos.org/transaction/0xfbb9e67b3123fe7ee1f529661d11475149eac7dbd762277f4c84f6e197834315>

Save terminal and explorer screenshots before marking proof complete in the dev log.

## Completed Before Week 4

- Transfer CKB: completed in Week 1.
- Testnet transaction/deployment: completed in Week 3.

## Setup

```bash
pnpm install
cp .env.example .env
```

Fill `.env` with testnet wallet details.

## Commands

```bash
pnpm check
pnpm mint:dob
```

## Proof Checklist

- [x] Terminal output showing DOB mint transaction hash
- [x] Pudge RPC confirmation showing committed transaction
- [x] Pudge explorer screenshot showing committed transaction
- [x] Explorer link recorded in `../ckb-weekly-report-w4.md`
- [ ] Dev log updated with setup notes and errors fixed

## Completed Course Work

Script Development Course completed:

- [x] Class 1: Validation Model
- [x] Class 2: Script Basics
- [x] Class 3: UDT
- [x] Class 4: WebAssembly on CKB
- [x] Class 5: Debugging
- [x] Class 6: Type ID
- [x] Class 7: Advanced Duktape Examples
- [x] Class 8: Performant WASM
- [x] Class 9: Cycle Reductions in Duktape Script
- [x] Class 10: Language Choices

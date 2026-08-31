# CKB Weekly Report - Week 1

Reporting period: 19 - 25 August 2026  
Participant: Riyan Ainur  
Track: Builder  

## 1. Summary

The goal of Week 1 was to set up the local CKB development environment, understand CKB architecture and the Cell Model, and practice transaction construction on the CKB Testnet.

## 2. Completed This Week

### Environment Setup
- Installed and configured CKB local dev environment and node tooling.
- Set up Rust, Cargo, and Node.js toolchains for CKB development.

### CKB Fundamentals & Academy Courses
- Completed CKB Academy theoretical modules covering:
  - Cell Model structure: capacity, lock script, type script, and cell data.
  - Script execution model: verification on CKB-VM, difference between Lock (authorization) and Type (state validation).
  - Transaction architecture: RFC 0022 structure and comparison to UTXO.
- Completed practical lessons:
  - Lesson 1: Cell Model
  - Lesson 2: Transaction Anatomy
  - Lesson 3: Capacity & Shannons (1 CKB = 10^8 Shannons)
  - Lesson 4: Dev Environment Setup
  - Lesson 5: First CKB Transfer using Omnilock
  - Lesson 6: Building a Cell Explorer

## 3. Practical On-Chain Results

Successfully built, signed, and broadcasted a manual transfer transaction on the CKB Testnet (Pudge) using Omnilock.

- Transaction Hash: `0xcfad415c6c746d8928aa7bc3b7d51b289dc272519c42d67a3cd88ba8b1dc3005`
- Network: CKB Testnet (Pudge)
- Input OutPoint: `0xd7b2adc2156e6a9f1a73d9321afbaded3408e22ec66111f6a48b19cdda4809f9#1`
- Output Capacity: 99.0 CKB (`0x24e2c0400`)
- Tx Fee: 1.0 CKB
- Cell Dependencies: SECP256K1_BLAKE160 (depGroup) and Omnilock (code)
- Status: Committed on-chain
- Explorer Link: [View Transaction on Explorer](https://pudge.explorer.nervos.org/transaction/0xcfad415c6c746d8928aa7bc3b7d51b289dc272519c42d67a3cd88ba8b1dc3005)

## 4. Key Learnings & Technical Notes

- Capacity and Fee Calculation: Learned rule `Sum(Outputs) <= Sum(Inputs) - Fee`. Fixed `Malformed Overflow` pool errors by properly deducting fees from output capacity.
- Witness Serialization: Generated transaction hash, signed with private key, and formatted signature into `WitnessArgs.lock`.
- Cell Dependencies: Understood why `cellDeps` are required for referencing on-chain script binaries (`SECP256K1_BLAKE160` and `OMNILOCK`).

## 5. Challenges & Resolutions

- Transaction serialization errors when packing witness data resolved after verifying `WitnessArgs` schema.
- Devnet/Testnet RPC connection handling resolved by checking node sync status and correct port configs.

## 6. Plan for Week 2

- Explore CCC (Common Chain Connector) for web application integration.
- Start writing and compiling basic CKB scripts in Rust.
- Connect frontend dApp with CKB Testnet using CCC wallet connectors.

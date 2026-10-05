# CKB Builder Repository

Personal repository tracking progress, smart contracts, dApps, and weekly reports for the **CKB Builder Track**.

---

## Weekly Progress Overview

| Week | Milestone / Topic | Artifact / Code | Report |
|---|---|---|---|
| **Week 1** | CKB Fundamentals & Testnet Transfer | [`week-1/`](./week-1/) | [`week-1/ckb-weekly-report-w1.md`](./week-1/ckb-weekly-report-w1.md) |
| **Week 2** | Local Script Development (CKB-JS-VM) | [`week-2/`](./week-2/) | [`week-2/ckb-weekly-report-w2.md`](./week-2/ckb-weekly-report-w2.md) |
| **Week 3** | Testnet Contract Bytecode Deployment | [`week-3/`](./week-3/) | [`week-3/ckb-weekly-report-w3.md`](./week-3/ckb-weekly-report-w3.md) |
| **Week 4** | Digital Object (DOB) Minter via Spore | [`week-4/dob-minter/`](./week-4/dob-minter/) | [`week-4/ckb-weekly-report-w4.md`](./week-4/ckb-weekly-report-w4.md) |
| **Week 5** | Application Layer: **Proof of X** | [`week-5/proof-of-x/`](./week-5/proof-of-x/) | [`week-5/ckb-weekly-report-w5.md`](./week-5/ckb-weekly-report-w5.md) |
| **Week 6** | Proof of X Type Script on Testnet + Molecule | [`week-6/pox-type/`](./week-6/pox-type/) | [`week-6/ckb-weekly-report-w6.md`](./week-6/ckb-weekly-report-w6.md) |
| **Week 7** | PoX Badge (xUDT) + issuer key rotation | [`week-5/proof-of-x/src/badge/`](./week-5/proof-of-x/src/badge/) | [`week-7/ckb-weekly-report-w7.md`](./week-7/ckb-weekly-report-w7.md) |

---

## Week 6 Highlight: Proof of X, Enforced On-Chain

**Proof of X** represents a verifiable attestation (*Proof of Contribution*) as an **owned CKB Cell** whose state transitions (`VALID` → `REVOKED`) are enforced by a Type Script deployed on CKB Testnet. The dApp cannot authorize anything: it can only build transactions the script is willing to accept.

- **Live Demo:** [https://ckbuilder.vercel.app/](https://ckbuilder.vercel.app/)

| | |
|---|---|
| Type Script code hash | `0x98d78fa7216b17ef9501a6ee7dff98a8a9f2ea05b04a593a6ff84782ea5b55ff` (`data2`, not upgradable) |
| Deploy tx | [`0x75f75dfb...`](https://pudge.explorer.nervos.org/transaction/0x75f75dfb1ec059c3b815469d389e06056def390d7d9d5855484055593c09f7cc) |
| Example issue tx | [`0x88b57659...`](https://pudge.explorer.nervos.org/transaction/0x88b576598687120bd0199411fd27632ba60bc42d91987378e99fb6579883ab84) |
| Example revoke tx | [`0xa5214be1...`](https://pudge.explorer.nervos.org/transaction/0xa5214be149e8afba96adf5f3680f43b6af402956cbd16a2d4d2eedd9add0e2e0) |

### Quick Start

```bash
# Type Script (week 6)
cd week-6/pox-type
pnpm install
pnpm build       # compile contracts/pox-type -> dist/pox-type.bc
pnpm test:only   # 14 cases against the native ckb-debugger

# DApp (week 5, wired to the deployed script in week 6)
cd week-5/proof-of-x
pnpm install
pnpm test:protocol   # codec, id and type-script-args invariants
pnpm dev             # Next.js dev server on port 3005
```

Running the on-chain end-to-end flow (issue → verify → revoke → verify) spends real testnet CKB and needs the authorized issuer's key:

```bash
cd week-5/proof-of-x
CKB_PRIVATE_KEY=0x... pnpm test:e2e
```

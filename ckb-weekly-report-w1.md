# ⚡ CKB Developer Progress — Weekly Report #1

> **Focus:** CKB Fundamentals, Transaction Mechanics & Testnet Practice
> **Status:** 🟢 Phase 1 Completed

---

## 👤 Overview & Metadata

| Attribute          | Details                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Developer**      | Riyan Ainur                                                                                                                         |
| **Week Ending**    | August 25, 2026                                                                                                                                   |
| **Ecosystem**      | Nervos Network (CKB)                                                                                                                                |
| **On-Chain Proof** | [View Tx Hash (`0xcfad4...3005`)](https://pudge.explorer.nervos.org/transaction/0xcfad415c6c746d8928aa7bc3b7d51b289dc272519c42d67a3cd88ba8b1dc3005) |

---

## 🎯 Summary

Completed Week 1 covering CKB architecture fundamentals, transaction mechanics, and local environment configuration. Successfully constructed, signed, and broadcasted a manual transfer transaction on the CKB Testnet using Omnilock.

---

## 📚 Completed Courses & Modules

### 1️⃣ CKB Basic Theoretical Knowledge (CKB Academy)

* **Cell Model Basics:** Structure of a cell (`capacity`, `lock`, `type`, `data`), ownership logic, and handling lost lock code scenarios.
* **Script & Code Execution:** Code location on-chain, basic roles of Lock Scripts (authentication) and Type Scripts (state logic).
* **Transaction Architecture:** Transaction definition, RFC 0022 structure, and core concepts compared to Bitcoin's UTXO model.

### 2️⃣ CKB Basic Practical Operation — Learning CKB Phase 1

* [x] **Lesson 1:** What is CKB? The Cell Model
* [x] **Lesson 2:** Transaction Anatomy
* [x] **Lesson 3:** Capacity & CKBytes (`1 CKB = 10^8 Shannons`)
* [x] **Lesson 4:** Dev Environment Setup
* [x] **Lesson 5:** Your First CKB Transfer (Omnilock)
* [x] **Lesson 6:** Building a Cell Explorer

---

## 🛠️ Practical Progress & On-Chain Result

### 🚀 Testnet Transfer Transaction

Manually built, serialized, signed, and executed a transfer transaction on CKB Testnet.

```yaml
Transaction Hash : 0xcfad415c6c746d8928aa7bc3b7d51b289dc272519c42d67a3cd88ba8b1dc3005
Network          : CKB Testnet
Input OutPoint   : 0xd7b2adc2156e6a9f1a73d9321afbaded3408e22ec66111f6a48b19cdda4809f9#1
Output Capacity  : 0x24e2c0400 (99.0 CKB)
Tx Fee           : 1.0 CKB
Cell Dependencies: SECP256K1_BLAKE160 (depGroup) + OMNILOCK (code)
Status           : Committed / On-Chain
```

---

## 💡 Key Takeaways

### 1. Capacity Rules & Fees

* Applied capacity rule:
  `Σ Outputs Capacity ≤ Σ Inputs Capacity − Fee`
* Resolved `Malformed Overflow` pool error by adjusting output capacity to reserve transaction fees.

### 2. Witness Formatting — `WitnessArgs`

* Generated raw transaction message hash.
* Signed payload via wallet cryptographic key.
* Serialized signature into `WitnessArgs.lock` for the `witnesses` array.

### 3. Cell Dependencies — `cellDeps`

* Configured dual `cellDeps` required by Omnilock:
  `SECP256K1_BLAKE160` and `OMNILOCK`.

---

## 💻 Environment

* CKB node and local dev environment installed and functional.
* Basic CLI usage and debugging started.
* Rust and Cargo installed.

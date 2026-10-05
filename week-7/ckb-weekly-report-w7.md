# CKB Weekly Report - Week 7

Reporting period: 29 September - 5 October 2026  
Participant: Riyan Ainur  
Track: Builder

## 1. Summary

This week I picked xUDT from the advanced reading list and used it inside my own project instead of minting a throwaway token. The result is a **PoX Badge**: the Proof of X issuer can send badge tokens to whoever holds a VALID attestation.

While building it I found that the issuer wallet I used in Week 6 was not private to me. Someone else had already spent my Week 6 contract cell with that key. I rotated the issuer key and redeployed the same bytecode. That turned out to be the most useful thing I learned this week.

## 2. Completed Milestones

Carried from earlier weeks:

- [x] Transfer CKB (Week 1)
- [x] Deploy contract on testnet (Week 3)
- [x] Create DOB via Spore (Week 4)
- [x] Proof of X dApp (Week 5)
- [x] Proof of X Type Script on testnet (Week 6)

New this week:

- [x] PoX Badge CLI: `badge:issue`, `badge:reward`, `badge:balance` in `week-5/proof-of-x/src/badge/`
- [x] Rotated the PoX issuer to a fresh key (`0x21c17dfb...f4e6`)
- [x] Redeployed the Proof of X Type Script from the new key (same code hash `0x98d78fa7...`)
  - Transaction Hash: `0x7f403e4e0f3134e8fea59cef54d913b77d9709f589f2a64ec64c164a083368aa`
  - Explorer Link: [View on Explorer](https://pudge.explorer.nervos.org/transaction/0x7f403e4e0f3134e8fea59cef54d913b77d9709f589f2a64ec64c164a083368aa)
- [x] Issued an attestation with the new issuer
  - `attestation_id`: `0xbb423b19c79a84d72a4b7559697cb7d312fca2cb6037c35bcec907a1aa31401f`
  - Transaction Hash: `0x9bf88682bbdc95f5e37223c9587ee9946db4ba4fa06bc37f9ef88ee0c6fb909f`
  - Explorer Link: [View on Explorer](https://pudge.explorer.nervos.org/transaction/0x9bf88682bbdc95f5e37223c9587ee9946db4ba4fa06bc37f9ef88ee0c6fb909f)
- [x] Rewarded that attestation's holder with 100 badge tokens
  - Transaction Hash: `0x61cd8bd9cc42fdd271f4246f14ebcac803dab88a5fed318cdc05022e7b76b55e`
  - Output 0: 142 CKB cell, xUDT type, data `0x64000000000000000000000000000000` (100 as u128 LE)
  - Explorer Link: [View on Explorer](https://pudge.explorer.nervos.org/transaction/0x61cd8bd9cc42fdd271f4246f14ebcac803dab88a5fed318cdc05022e7b76b55e)

## 3. How the badge works

xUDT is sUDT plus optional extension scripts. I only used the basic part.

- Type script = xUDT (`code_hash 0x25c29dc3...75bb`, `hash_type type` on testnet), `args` = issuer lock hash (32 bytes).
- Cell data = amount as `u128` little-endian, 16 bytes.
- If any input in the transaction has a lock hash equal to `args`, xUDT runs in **owner mode** and allows minting. Otherwise the total amount in the outputs can't be more than in the inputs.

The issuer's own cells pay the capacity for the badge cell, so the owner lock is already in the inputs. Minting needs nothing extra.

`badge:reward <attestation_id>` does this:

1. Runs the existing Week 5 verifier on the attestation. If it is not VALID, it stops. I checked this against the Week 6 attestation (`0x566b1be7...`), which is REVOKED:
   ```
   status      : REVOKED
   Refusing to reward: attestation is REVOKED.
   ```
2. Checks that the key is the authorized PoX issuer.
3. Builds one output: lock = attestation holder's lock, type = badge, data = amount.
4. Sends it and prints the holder's badge balance.

Real run:

```
attestation : 0xbb423b19c79a84d72a4b7559697cb7d312fca2cb6037c35bcec907a1aa31401f
status      : VALID
amount      : 100
tx hash     : 0x61cd8bd9cc42fdd271f4246f14ebcac803dab88a5fed318cdc05022e7b76b55e
holder badge balance: 100
```

Everything uses `@ckb-ccc/core` (`Script.fromKnownScript`, `addCellDepsOfKnownScripts`, `completeInputsByCapacity`, `completeFeeBy`, `udtBalanceFrom`). No new dependency.

## 4. What I learned

### A token is its whole type script

My first version used the Week 6 issuer lock hash as `args`. Before sending anything, I ran `badge:balance` on the issuer address and it already showed a huge balance. Listing the cells showed xUDT cells with exactly those args, from transactions dated **April 2024**, long before I joined the track. I then tried `args = lock hash + 0x00000000` (flags = 0 means no extension, per the xUDT RFC). That type script already had lots of cells too, with amounts like 42 and 69.

Two things came out of this:

1. A token on CKB has no name registry. Its identity is the full type script (code hash + hash type + args). If two people mint with the same args, it is the same token.
2. That wallet had activity from 2024 that wasn't mine, so its private key was not private. In Week 6 it was the **authorized PoX issuer**, which means anyone with that key could issue or revoke attestations. The Type Script was working correctly. It was protecting the wrong key.

### The same key also owned my contract cell

After rotating, my first `badge:issue` failed with:

```
TransactionFailedToResolve: Resolve failed Unknown(OutPoint(0x75f75dfb...09f7cc00000000))
```

That outpoint is the Week 6 code cell holding the Type Script bytecode. `getCellLive` said it was no longer live. Its lock was the old shared key, so whoever else has that key spent it and took the 3,648 CKB. Every Proof of X transaction depends on that cell as a `cellDep`, so the dApp was broken until I fixed it.

The Type Script itself does not hardcode an issuer. The issuer lock hash lives in each attestation's type script args. So the fix was:

- new key, funded from the faucet
- redeploy `dist/pox-type.bc` from the new key with the same `pnpm run deploy --network testnet`. I checked first that the local bytecode still hashes to `0x98d78fa7...`. Because the hash type is `data2`, the code hash is the hash of the bytes, so it did not change. Only the outpoint did.
- two changes in `config.ts`: `authorizedIssuerLockHash` and the `pox` cell dep outpoint

Old attestations stay on chain under the old issuer. The dApp now only looks for the new one.

Lesson: a code cell is a normal cell. Whoever can unlock it can destroy it, and then every script that depends on it stops working. Deploying without Type ID made the rules immutable, but it did not make the cell permanent.

### xUDT flags

The last 4 bytes of args (when present) are flags. `flags & 0x1FFFFFFF` picks the extension mode (0 = none, 1 = scripts in args, 2 = hash of scripts in args, scripts in witness). The top bits change how owner mode is checked, for example by input type script instead of input lock. I did not use any of these, but they are the answer to the limitation below.

## 5. Limitations

- Owner mode lets the issuer mint any amount, any number of times. "Only reward VALID attestations" is checked by my CLI, not on chain. A different client could mint badges for anyone.
- Nothing stops rewarding the same attestation twice.
- To enforce either rule on chain, I would need an xUDT extension script that reads the attestation cell. I have not built that.

## 6. Next week

- Show the holder's badge balance on the `/verify` page.
- Look at writing an xUDT extension script so the "VALID attestation only" rule moves on chain.

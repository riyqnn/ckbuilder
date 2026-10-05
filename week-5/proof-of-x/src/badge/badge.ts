/**
 * Proof of X - Badge token (xUDT).
 *
 * The badge is a plain xUDT whose args are the PoX issuer's lock hash. xUDT
 * runs in owner mode when an input carries that lock, so only the issuer can
 * mint. Cell data is the amount as a 16-byte little-endian u128.
 *
 * The token's identity is the whole type script, so the issuer wallet must not
 * have minted any other xUDT, or the badge and that token are the same thing.
 */

import { ccc, Client, Hex, ScriptLike, Signer } from "@ckb-ccc/core";

export function badgeTypeScript(client: Client, issuerLockHash: Hex) {
  return ccc.Script.fromKnownScript(client, ccc.KnownScript.XUdt, issuerLockHash);
}

export async function buildRewardTx(params: {
  signer: Signer;
  issuerLockHash: Hex;
  holderLock: ScriptLike;
  amount: bigint;
}) {
  const { signer, issuerLockHash, holderLock, amount } = params;
  const client = signer.client;

  const tx = ccc.Transaction.from({
    outputs: [{ lock: holderLock, type: await badgeTypeScript(client, issuerLockHash) }],
    outputsData: [ccc.numLeToBytes(amount, 16)],
  });
  await tx.addCellDepsOfKnownScripts(client, ccc.KnownScript.XUdt);

  // The issuer's cells pay for capacity, which also puts the owner lock in the
  // inputs and lets xUDT accept the mint.
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer);
  return tx;
}

export async function getBadgeBalance(client: Client, issuerLockHash: Hex, lock: ScriptLike) {
  const type = await badgeTypeScript(client, issuerLockHash);
  let total = BigInt(0);
  for await (const cell of client.findCellsByLock(lock, type)) {
    total += ccc.udtBalanceFrom(cell.outputData);
  }
  return total;
}

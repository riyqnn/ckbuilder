/**
 * Sends badge tokens to the holder of a VALID attestation.
 *
 *   CKB_PRIVATE_KEY=0x... pnpm badge:reward <attestation_id> [amount]
 *
 * Spends real testnet CKB. Only the authorized PoX issuer key is accepted.
 */

import { ccc, Hex } from "@ckb-ccc/core";
import { DEFAULT_PROTOCOL_CONFIG } from "../protocol/config";
import { verifyAttestation } from "../protocol/verifier";
import { buildRewardTx, getBadgeBalance } from "./badge";

const config = DEFAULT_PROTOCOL_CONFIG;

async function main() {
  const [attestationId, amountArg = "100"] = process.argv.slice(2);
  if (!attestationId || !/^0x[0-9a-fA-F]{64}$/.test(attestationId)) {
    throw new Error("Usage: pnpm badge:reward <attestation_id> [amount]");
  }
  const amount = BigInt(amountArg);
  if (amount <= BigInt(0)) {
    throw new Error("amount must be positive");
  }

  const client = new ccc.ClientPublicTestnet({ url: config.rpcUrl });

  const report = await verifyAttestation({ client, attestationId: attestationId as Hex, config });
  console.log("attestation :", attestationId);
  console.log("status      :", report.status);
  if (report.status !== "VALID" || !report.isValid || !report.cellInfo) {
    throw new Error(`Refusing to reward: attestation is ${report.status}.`);
  }

  const privateKey = process.env.CKB_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("CKB_PRIVATE_KEY is not set.");
  }

  const signer = new ccc.SignerCkbPrivateKey(client, privateKey);
  const issuerLockHash = (await signer.getAddressObjSecp256k1()).script.hash();
  if (issuerLockHash.toLowerCase() !== config.authorizedIssuerLockHash.toLowerCase()) {
    throw new Error("This key is not the authorized issuer for this deployment.");
  }

  const holderLock = report.cellInfo.holderLock;
  const holder = ccc.Address.fromScript(holderLock, client).toString();
  console.log("holder      :", holder);
  console.log("amount      :", amount.toString());

  const tx = await buildRewardTx({ signer, issuerLockHash, holderLock, amount });
  const txHash = await signer.sendTransaction(tx);
  console.log("tx hash     :", txHash);
  await client.waitTransaction(txHash);
  console.log("committed   :", `${config.explorerUrl}/transaction/${txHash}`);

  const balance = await getBadgeBalance(client, issuerLockHash, holderLock);
  console.log("holder badge balance:", balance.toString());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

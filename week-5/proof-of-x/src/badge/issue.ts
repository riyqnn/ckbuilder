/**
 * Issues a VALID attestation from the CLI, so there is something to reward.
 *
 *   CKB_PRIVATE_KEY=0x... pnpm badge:issue "<claim>" [holder address]
 *
 * Holder defaults to the issuer itself. Spends real testnet CKB.
 */

import { ccc } from "@ckb-ccc/core";
import { DEFAULT_PROTOCOL_CONFIG } from "../protocol/config";
import { buildIssueAttestationTx } from "../protocol/transactions";

const config = DEFAULT_PROTOCOL_CONFIG;

async function main() {
  const [claim, holderArg] = process.argv.slice(2);
  if (!claim) {
    throw new Error('Usage: pnpm badge:issue "<claim>" [holder address]');
  }

  const privateKey = process.env.CKB_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("CKB_PRIVATE_KEY is not set.");
  }

  const client = new ccc.ClientPublicTestnet({ url: config.rpcUrl });
  const signer = new ccc.SignerCkbPrivateKey(client, privateKey);
  const holderAddress = holderArg ?? (await signer.getRecommendedAddress());

  const { tx, attestationId } = await buildIssueAttestationTx({
    signer,
    holderAddress,
    claim,
    evidence: "https://github.com/riyanainur/ckbuilder",
    config,
  });
  const txHash = await signer.sendTransaction(tx);
  console.log("attestation :", attestationId);
  console.log("holder      :", holderAddress);
  console.log("tx hash     :", txHash);
  await client.waitTransaction(txHash);
  console.log("committed   :", `${config.explorerUrl}/transaction/${txHash}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

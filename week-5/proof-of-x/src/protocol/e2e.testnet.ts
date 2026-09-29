/**
 * Proof of X - end-to-end run against CKB Testnet (Pudge).
 *
 * Drives the same protocol modules the UI uses, so a pass here is evidence about
 * the deployed Type Script and not about a separate test harness:
 *
 *   issue -> verify -> revoke -> verify
 *
 * Requires CKB_PRIVATE_KEY (the authorized issuer's key) in the environment.
 * Running this spends real testnet CKB and writes to the chain.
 */

import { ccc } from "@ckb-ccc/core";
import { DEFAULT_PROTOCOL_CONFIG } from "./config";
import { discoverLiveAttestationCell } from "./discovery";
import { buildIssueAttestationTx, buildRevokeAttestationTx } from "./transactions";
import { ATTESTATION_STATUS_REVOKED, ATTESTATION_STATUS_VALID } from "./types";
import { verifyAttestation } from "./verifier";

const config = DEFAULT_PROTOCOL_CONFIG;

function explorer(txHash: string): string {
  return `${config.explorerUrl}/transaction/${txHash}`;
}

function printReport(label: string, report: Awaited<ReturnType<typeof verifyAttestation>>) {
  console.log(`\n--- ${label}: status=${report.status} isValid=${report.isValid} ---`);
  for (const check of report.checks) {
    console.log(`  [${check.passed ? "PASS" : "FAIL"}] ${check.name}: ${check.detail}`);
  }
  if (report.failureReason) {
    console.log(`  reason: ${report.failureReason}`);
  }
}

async function main() {
  const privateKey = process.env.CKB_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("CKB_PRIVATE_KEY is not set.");
  }

  const client = new ccc.ClientPublicTestnet({ url: config.rpcUrl });
  const signer = new ccc.SignerCkbPrivateKey(client, privateKey);
  const issuerAddress = await signer.getRecommendedAddress();
  const issuerLockHash = (await signer.getAddressObjSecp256k1()).script.hash();

  console.log("=== Proof of X E2E (CKB Testnet Pudge) ===");
  console.log("issuer address  :", issuerAddress);
  console.log("issuer lockHash :", issuerLockHash);
  console.log("authorized      :", config.authorizedIssuerLockHash);
  console.log("balance CKB     :", Number(await signer.getBalance()) / 1e8);

  if (issuerLockHash.toLowerCase() !== config.authorizedIssuerLockHash.toLowerCase()) {
    throw new Error("This key is not the authorized issuer for this deployment.");
  }

  // 1. Issue. The holder is the issuer here, which keeps the run self-contained.
  const { tx: issueTx, attestationId } = await buildIssueAttestationTx({
    signer,
    holderAddress: issuerAddress,
    claim: "Deployed and verified the Proof of X Type Script on CKB Testnet",
    evidence: "https://github.com/riyanainur/ckbuilder",
    config,
  });

  console.log("\n[1] issue");
  console.log("  attestation_id :", attestationId);
  console.log("  cell capacity  :", Number(issueTx.outputs[0].capacity) / 1e8, "CKB");
  console.log("  data bytes     :", (issueTx.outputsData[0].length - 2) / 2);
  console.log("  cellDeps       :", issueTx.cellDeps.length);

  const issueTxHash = await signer.sendTransaction(issueTx);
  console.log("  tx hash        :", issueTxHash);
  await client.waitTransaction(issueTxHash);
  console.log("  committed      :", explorer(issueTxHash));

  // 2. Verify the live VALID cell.
  const afterIssue = await verifyAttestation({ client, attestationId, config });
  printReport("after issue", afterIssue);
  if (afterIssue.status !== "VALID" || !afterIssue.isValid) {
    throw new Error("Attestation did not verify as VALID after issue.");
  }

  // 3. Revoke.
  const liveCell = await discoverLiveAttestationCell({ client, attestationId, config });
  if (!liveCell) {
    throw new Error("Live attestation cell not found before revoke.");
  }
  if (liveCell.data.status !== ATTESTATION_STATUS_VALID) {
    throw new Error("Live cell is not VALID before revoke.");
  }

  const { tx: revokeTx } = await buildRevokeAttestationTx({ signer, liveCell, config });
  console.log("\n[2] revoke");
  console.log("  input outPoint :", `${liveCell.outPoint.txHash}#${liveCell.outPoint.index}`);
  console.log("  data bytes     :", (revokeTx.outputsData[0].length - 2) / 2);

  const revokeTxHash = await signer.sendTransaction(revokeTx);
  console.log("  tx hash        :", revokeTxHash);
  await client.waitTransaction(revokeTxHash);
  console.log("  committed      :", explorer(revokeTxHash));

  // 4. Verify the REVOKED cell, found by attestation_id at its new OutPoint.
  const afterRevoke = await verifyAttestation({ client, attestationId, config });
  printReport("after revoke", afterRevoke);
  if (afterRevoke.status !== "REVOKED") {
    throw new Error("Attestation did not verify as REVOKED after revoke.");
  }
  if (afterRevoke.cellInfo?.data.status !== ATTESTATION_STATUS_REVOKED) {
    throw new Error("On-chain status is not REVOKED.");
  }

  console.log("\n=== E2E complete ===");
  console.log("attestation_id :", attestationId);
  console.log("issue tx       :", issueTxHash);
  console.log("revoke tx      :", revokeTxHash);
}

main().catch((err) => {
  console.error("E2E failed:", err);
  process.exit(1);
});

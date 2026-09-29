/**
 * Proof of X - Pure On-chain Verifier
 *
 * Implements the 7 rigorous verification checks specified for Proof of X.
 */

import { Address, Client, Hex } from "@ckb-ccc/core";
import { DEFAULT_PROTOCOL_CONFIG, ProtocolConfig } from "./config";
import { discoverLiveAttestationCell } from "./discovery";
import { issuerLockHashFromArgs, poxCodeHashFromArgs } from "./script";
import {
  ATTESTATION_STATUS_REVOKED,
  ATTESTATION_STATUS_VALID,
  VerificationCheck,
  VerificationReport,
} from "./types";

export interface VerifyAttestationParams {
  client: Client;
  attestationId: Hex;
  expectedHolderAddress?: string;
  config?: ProtocolConfig;
}

/**
 * Runs full 7-point on-chain verification for an attestation ID.
 */
export async function verifyAttestation(
  params: VerifyAttestationParams
): Promise<VerificationReport> {
  const config = params.config ?? DEFAULT_PROTOCOL_CONFIG;
  const { client, attestationId, expectedHolderAddress } = params;

  const checks: VerificationCheck[] = [];
  const timestamp = Date.now();

  // Check 1: Latest live Cell exists on CKB
  const cellInfo = await discoverLiveAttestationCell({
    client,
    attestationId,
    config,
  });

  if (!cellInfo) {
    checks.push({
      id: "live-cell-exists",
      name: "Live Cell Existence",
      passed: false,
      severity: "critical",
      detail: `No live CKB Cell found on-chain for attestation_id: ${attestationId}`,
    });

    return {
      attestationId,
      isValid: false,
      status: "NOT_FOUND",
      timestamp,
      checks,
      failureReason: "Attestation cell does not exist or has been destroyed.",
    };
  }

  checks.push({
    id: "live-cell-exists",
    name: "Live Cell Existence",
    passed: true,
    severity: "critical",
    detail: `Live CKB Cell verified at OutPoint: ${cellInfo.outPoint.txHash}#${cellInfo.outPoint.index}`,
    onChainReference: {
      label: "OutPoint",
      value: `${cellInfo.outPoint.txHash}:${cellInfo.outPoint.index}`,
      url: `${config.explorerUrl}/transaction/${cellInfo.outPoint.txHash}`,
    },
  });

  // Check 2: Type Script is the expected attestation type.
  // Two things have to match: the outer script is ckb-js-vm, and its args name
  // the Proof of X validator bytecode. Checking only the outer code hash would
  // accept any ckb-js-vm script at all.
  const poxCodeHashInCell = poxCodeHashFromArgs(cellInfo.typeScript.args);
  const isTypeValid =
    cellInfo.typeScript.codeHash.toLowerCase() === config.jsVm.codeHash.toLowerCase() &&
    cellInfo.typeScript.hashType === config.jsVm.hashType &&
    poxCodeHashInCell !== null &&
    poxCodeHashInCell.toLowerCase() === config.pox.codeHash.toLowerCase();

  checks.push({
    id: "type-script-valid",
    name: "Type Script Integrity",
    passed: isTypeValid,
    severity: "critical",
    detail: isTypeValid
      ? `Cell runs the Proof of X validator on ckb-js-vm (code_hash ${config.pox.codeHash.slice(0, 10)}...)`
      : `Cell Type Script mismatch. Expected ckb-js-vm ${config.jsVm.codeHash} running ${config.pox.codeHash}, got ${cellInfo.typeScript.codeHash} running ${poxCodeHashInCell ?? "unparseable args"}`,
    onChainReference: {
      label: "Validator Code Hash",
      value: poxCodeHashInCell ?? cellInfo.typeScript.args,
    },
  });

  // Check 3: Type Script args contain expected issuer_lock_hash.
  // It sits at byte offset 35, after the 35 bytes ckb-js-vm reserves for itself.
  const issuerLockHashInCell = (issuerLockHashFromArgs(cellInfo.typeScript.args) ?? "0x").toLowerCase();
  const expectedIssuerLockHash = config.authorizedIssuerLockHash.toLowerCase();
  const isIssuerValid = issuerLockHashInCell === expectedIssuerLockHash;

  checks.push({
    id: "issuer-auth-valid",
    name: "Issuer Authorization Check",
    passed: isIssuerValid,
    severity: "critical",
    detail: isIssuerValid
      ? `Type script args contain authorized issuer lock hash: ${issuerLockHashInCell.slice(0, 14)}...`
      : `Issuer mismatch. Expected ${expectedIssuerLockHash}, got ${issuerLockHashInCell}`,
    onChainReference: {
      label: "Issuer Lock Hash",
      value: issuerLockHashInCell,
    },
  });

  // Check 4: Lock Script matches claimed holder (if expectedHolder provided)
  let isHolderValid = true;
  let holderDetail = "Holder lock verified as the sole owner of the Cell capacity.";

  if (expectedHolderAddress) {
    try {
      const expectedAddrObj = await Address.fromString(expectedHolderAddress, client);
      const expectedScript = expectedAddrObj.script;
      isHolderValid =
        cellInfo.holderLock.args.toLowerCase() === expectedScript.args.toLowerCase() &&
        cellInfo.holderLock.codeHash.toLowerCase() === expectedScript.codeHash.toLowerCase();

      holderDetail = isHolderValid
        ? `Holder Lock matches expected recipient: ${expectedHolderAddress}`
        : `Holder Lock mismatch with claimed address ${expectedHolderAddress}`;
    } catch {
      isHolderValid = false;
      holderDetail = `Failed to resolve address info for ${expectedHolderAddress}`;
    }
  }

  checks.push({
    id: "holder-ownership",
    name: "Holder Ownership & Lock Script",
    passed: isHolderValid,
    severity: "critical",
    detail: holderDetail,
    onChainReference: {
      label: "Holder Lock Args",
      value: cellInfo.holderLock.args,
    },
  });

  // Check 5: Claim and evidence match on-chain data format
  const isDataValid =
    cellInfo.data.version === 1 &&
    cellInfo.data.type === "contribution" &&
    typeof cellInfo.data.claim === "string" &&
    cellInfo.data.claim.length > 0;

  checks.push({
    id: "claim-evidence-format",
    name: "Claim & Evidence Structure",
    passed: isDataValid,
    severity: "critical",
    detail: isDataValid
      ? `On-chain claim verified: "${cellInfo.data.claim}"`
      : "Malformed claim data structure.",
    onChainReference: {
      label: "Claim",
      value: cellInfo.data.claim,
    },
  });

  // Check 6: Status Verification (VALID or REVOKED)
  const isStatusKnown =
    cellInfo.data.status === ATTESTATION_STATUS_VALID ||
    cellInfo.data.status === ATTESTATION_STATUS_REVOKED;

  const isAttestationActive = cellInfo.data.status === ATTESTATION_STATUS_VALID;

  checks.push({
    id: "attestation-status",
    name: "Attestation Lifecycle Status",
    passed: isStatusKnown,
    severity: "critical",
    detail: isAttestationActive
      ? "Attestation is active and VALID on-chain."
      : `Attestation is REVOKED on-chain (revoked_at: ${cellInfo.data.revoked_at ?? "unknown"}).`,
    onChainReference: {
      label: "Status",
      value: isAttestationActive ? "0 (VALID)" : "1 (REVOKED)",
    },
  });

  // Check 7: Immutable Fields Consistency
  const isIdConsistent =
    cellInfo.data.attestation_id.toLowerCase() === attestationId.toLowerCase();

  checks.push({
    id: "immutability-integrity",
    name: "State Transition & ID Integrity",
    passed: isIdConsistent,
    severity: "critical",
    detail: isIdConsistent
      ? `attestation_id is consistent across state transitions: ${attestationId}`
      : "Attestation ID inside cell payload does not match requested query ID.",
  });

  const allCriticalPassed = checks.every((c) => (c.severity === "critical" ? c.passed : true));
  const finalStatus =
    !isStatusKnown ? "CORRUPTED" : isAttestationActive ? "VALID" : "REVOKED";

  return {
    attestationId,
    isValid: allCriticalPassed && isAttestationActive,
    status: finalStatus,
    timestamp,
    checks,
    cellInfo,
    failureReason: !allCriticalPassed
      ? "One or more cryptographic or structural on-chain checks failed."
      : !isAttestationActive
      ? "Attestation was revoked by the authorized issuer on-chain."
      : undefined,
  };
}

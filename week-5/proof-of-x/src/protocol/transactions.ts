/**
 * Proof of X - Transaction Builders
 *
 * Implements Issue and Revoke transaction construction using CCC APIs.
 */

import { Address, CellDep, Hex, Script, Signer, Transaction } from "@ckb-ccc/core";
import { encodeAttestationData } from "./codec";
import { DEFAULT_PROTOCOL_CONFIG, ProtocolConfig } from "./config";
import { generateAttestationId } from "./id";
import { attestationCellDeps, buildAttestationTypeScript } from "./script";
import {
  ATTESTATION_STATUS_REVOKED,
  ATTESTATION_STATUS_VALID,
  AttestationCellInfo,
  OnChainAttestationData,
} from "./types";

export interface IssueParams {
  signer: Signer;
  holderAddress: string;
  claim: string;
  evidence?: string;
  config?: ProtocolConfig;
}

export interface RevokeParams {
  signer: Signer;
  liveCell: AttestationCellInfo;
  config?: ProtocolConfig;
}

export interface IssueResult {
  tx: Transaction;
  attestationId: Hex;
  initialData: OnChainAttestationData;
}

/**
 * Builds an Issue Attestation Transaction.
 *
 * Cell State:
 *   Output Cell:
 *     - Lock: Holder's Lock Script
 *     - Type: Attestation Type Script (args: issuer_lock_hash)
 *     - Data: Encoded OnChainAttestationData (status: 0)
 *     - Capacity: Calculated based on cell size (approx 150 - 200 CKB)
 */
export async function buildIssueAttestationTx(
  params: IssueParams
): Promise<IssueResult> {
  const config = params.config ?? DEFAULT_PROTOCOL_CONFIG;
  const { signer, holderAddress, claim, evidence } = params;

  // 1. Resolve Issuer Lock and Holder Lock
  const issuerAddress = await signer.getRecommendedAddress();
  const issuerScript = (await Address.fromString(issuerAddress, signer.client)).script;
  const issuerLockHash = issuerScript.hash();

  const holderScript = (await Address.fromString(holderAddress, signer.client)).script;

  // 2. Prepare mock attestation_id for initial sizing
  const placeholderId = ("0x" + "0".repeat(64)) as Hex;
  const now = Math.floor(Date.now() / 1000);

  const provisionalData: OnChainAttestationData = {
    version: 1,
    attestation_id: placeholderId,
    type: "contribution",
    claim,
    evidence: evidence?.trim() ?? "",
    issued_at: now,
    status: ATTESTATION_STATUS_VALID,
    revoked_at: 0,
  };

  const encodedData = encodeAttestationData(provisionalData);

  // 3. Define Type Script (ckb-js-vm, args carry the pox bytecode + issuer)
  const typeScript = buildAttestationTypeScript(issuerLockHash, config);

  // 4. Instantiate Transaction and set placeholder output
  const tx = Transaction.from({
    outputs: [
      {
        lock: holderScript,
        type: typeScript,
        capacity: 0n, // will be calculated
      },
    ],
    outputsData: [encodedData],
  });

  // 1 byte of cell = 1 CKB = 100,000,000 shannons. Exact occupied capacity is
  // also the final capacity: Molecule encodes an attestation to the same length
  // whether VALID or REVOKED, so revocation cannot grow the data and there is
  // nothing to pad against. The Week 5 JSON codec did grow, which is why it
  // needed slack it never actually had.
  const cellByteSize = Number(tx.outputs[0].occupiedSize) + Math.ceil((encodedData.length - 2) / 2);
  tx.outputs[0].capacity = BigInt(cellByteSize) * 100000000n;

  // 5. The interpreter and the validator bytecode must both be in scope.
  tx.cellDeps.push(...attestationCellDeps(config).map((dep) => CellDep.from(dep)));

  // 6. Complete transaction inputs from Issuer's wallet to find input 0
  await tx.completeInputsByCapacity(signer);

  if (tx.inputs.length === 0) {
    throw new Error("Insufficient CKB balance to issue attestation.");
  }

  // 7. Derive deterministic attestation_id from the first input OutPoint
  const firstInputOutPoint = tx.inputs[0].previousOutput;
  const attestationId = generateAttestationId({
    txHash: firstInputOutPoint.txHash,
    index: firstInputOutPoint.index,
  });

  // 8. Re-encode with exact attestation_id
  const finalData: OnChainAttestationData = {
    ...provisionalData,
    attestation_id: attestationId,
  };
  const finalEncodedData = encodeAttestationData(finalData);
  tx.outputsData[0] = finalEncodedData;

  // Complete fee balance
  await tx.completeFeeBy(signer, 2000n);

  return {
    tx,
    attestationId,
    initialData: finalData,
  };
}

/**
 * Builds a Revoke Attestation Transaction.
 *
 * Cell State:
 *   Input: Consumes live VALID cell
 *   Output Cell:
 *     - Lock: Same Holder's Lock Script
 *     - Type: Same Attestation Type Script (args: issuer_lock_hash)
 *     - Data: Encoded OnChainAttestationData (status: 1, revoked_at: now)
 *     - Capacity: Preserves cell capacity
 */
export async function buildRevokeAttestationTx(
  params: RevokeParams
): Promise<{ tx: Transaction; revokedData: OnChainAttestationData }> {
  const config = params.config ?? DEFAULT_PROTOCOL_CONFIG;
  const { signer, liveCell } = params;

  if (liveCell.data.status === ATTESTATION_STATUS_REVOKED) {
    throw new Error("Attestation is already in REVOKED state.");
  }

  const now = Math.floor(Date.now() / 1000);
  const revokedData: OnChainAttestationData = {
    ...liveCell.data,
    status: ATTESTATION_STATUS_REVOKED,
    revoked_at: now,
  };

  const newEncodedData = encodeAttestationData(revokedData);

  // Construct Type and Lock scripts
  const holderScript = new Script(
    liveCell.holderLock.codeHash,
    liveCell.holderLock.hashType,
    liveCell.holderLock.args
  );

  // Reused verbatim: the script group is keyed on the full script hash, so any
  // change here would split the transaction into two groups instead of
  // performing a transition.
  const typeScript = new Script(
    liveCell.typeScript.codeHash,
    liveCell.typeScript.hashType,
    liveCell.typeScript.args
  );

  // Initialize Transaction consuming the live attestation cell as input
  const tx = Transaction.from({
    inputs: [
      {
        previousOutput: {
          txHash: liveCell.outPoint.txHash,
          index: liveCell.outPoint.index,
        },
      },
    ],
    outputs: [
      {
        lock: holderScript,
        type: typeScript,
        capacity: liveCell.capacity,
      },
    ],
    outputsData: [newEncodedData],
  });

  tx.cellDeps.push(...attestationCellDeps(config).map((dep) => CellDep.from(dep)));

  // The issuer's own cells come in here, which is also what proves authorization
  // to the Type Script: it looks for an input whose lock hash is the issuer's.
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, 2000n);

  return {
    tx,
    revokedData,
  };
}

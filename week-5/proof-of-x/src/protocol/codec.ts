/**
 * Codec for OnChainAttestationData.
 *
 * Molecule, per week-6/pox-type/schema/pox.mol. This replaces the JSON encoding
 * used in Week 5, which had a concrete defect: JSON.stringify omits `revoked_at`
 * while it is undefined, so one attestation serialized to 269 bytes as VALID and
 * 293 bytes as REVOKED. Issue sized the cell at exactly the VALID payload and
 * revoke preserves that capacity, so every revoke would have been rejected for
 * insufficient capacity -- 430 CKB held against 454 CKB required. It was never
 * observed because no attestation had ever been issued on-chain.
 *
 * Here every field is always present, so a given attestation encodes to the same
 * length whether VALID or REVOKED, and capacity is preserved by construction. The
 * encoding is also canonical, which is what lets the Type Script compare
 * immutable fields as byte ranges instead of field by field.
 */

import { Hex, bytesFrom, hexFrom, mol } from "@ckb-ccc/core";
import {
  ATTESTATION_STATUS_REVOKED,
  ATTESTATION_STATUS_VALID,
  KIND_CONTRIBUTION,
  OnChainAttestationData,
} from "./types";

export const MAX_CLAIM_LENGTH = 120;
export const MAX_EVIDENCE_LENGTH = 150;

/** Field order is the wire contract; see schema/pox.mol. */
export const AttestationData = mol.table({
  version: mol.Uint8,
  attestation_id: mol.Byte32,
  kind: mol.Uint8,
  status: mol.Uint8,
  issued_at: mol.Uint64,
  revoked_at: mol.Uint64,
  claim: mol.String,
  evidence: mol.String,
});

export class AttestationCodecError extends Error {
  constructor(message: string) {
    super(`[AttestationCodec] ${message}`);
    this.name = "AttestationCodecError";
  }
}

/**
 * Bounds are in UTF-8 bytes, which is what the cell and the Type Script see.
 * String.length counts UTF-16 units, so it undercounts anything non-ASCII.
 */
export function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function validateAttestationData(data: OnChainAttestationData): void {
  if (data.version !== 1) {
    throw new AttestationCodecError(`Unsupported version: ${data.version}. Expected version 1.`);
  }

  if (data.type !== "contribution") {
    throw new AttestationCodecError(
      `Unsupported attestation type: ${data.type}. Expected "contribution".`,
    );
  }

  if (!data.attestation_id || !/^0x[0-9a-fA-F]{64}$/.test(data.attestation_id)) {
    throw new AttestationCodecError(
      `Invalid attestation_id format. Must be 32-byte hex (66 characters with 0x). Got: ${data.attestation_id}`,
    );
  }

  if (!data.claim || typeof data.claim !== "string") {
    throw new AttestationCodecError("Claim is required and must be a string.");
  }

  const claimBytes = utf8Length(data.claim);
  if (claimBytes > MAX_CLAIM_LENGTH) {
    throw new AttestationCodecError(
      `Claim exceeds maximum allowed length of ${MAX_CLAIM_LENGTH} bytes (length: ${claimBytes}).`,
    );
  }

  const evidenceBytes = utf8Length(data.evidence);
  if (evidenceBytes > MAX_EVIDENCE_LENGTH) {
    throw new AttestationCodecError(
      `Evidence URL exceeds maximum allowed length of ${MAX_EVIDENCE_LENGTH} bytes (length: ${evidenceBytes}).`,
    );
  }

  if (data.status !== ATTESTATION_STATUS_VALID && data.status !== ATTESTATION_STATUS_REVOKED) {
    throw new AttestationCodecError(
      `Invalid status: ${data.status}. Allowed values: 0 (VALID), 1 (REVOKED).`,
    );
  }

  if (typeof data.issued_at !== "number" || data.issued_at <= 0) {
    throw new AttestationCodecError(`Invalid issued_at timestamp: ${data.issued_at}`);
  }

  if (data.status === ATTESTATION_STATUS_REVOKED && data.revoked_at <= 0) {
    throw new AttestationCodecError(
      "revoked_at timestamp is required when status is REVOKED (1).",
    );
  }

  if (data.status === ATTESTATION_STATUS_VALID && data.revoked_at !== 0) {
    throw new AttestationCodecError("revoked_at must be 0 while status is VALID (0).");
  }
}

export function encodeAttestationData(data: OnChainAttestationData): Hex {
  validateAttestationData(data);

  return hexFrom(
    AttestationData.encode({
      version: 1,
      attestation_id: data.attestation_id.toLowerCase() as Hex,
      kind: KIND_CONTRIBUTION,
      status: data.status,
      issued_at: BigInt(Math.floor(data.issued_at)),
      revoked_at: BigInt(Math.floor(data.revoked_at)),
      claim: data.claim.trim(),
      evidence: data.evidence.trim(),
    }),
  );
}

export function decodeAttestationData(rawHex: Hex): OnChainAttestationData {
  if (!rawHex || rawHex === "0x") {
    throw new AttestationCodecError("Empty cell data provided.");
  }

  let decoded: ReturnType<typeof AttestationData.decode>;
  try {
    decoded = AttestationData.decode(bytesFrom(rawHex));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AttestationCodecError(`Failed to decode cell data: ${message}`);
  }

  if (decoded.kind !== KIND_CONTRIBUTION) {
    throw new AttestationCodecError(`Unsupported kind: ${decoded.kind}. Expected 0.`);
  }

  const data: OnChainAttestationData = {
    version: 1,
    attestation_id: hexFrom(decoded.attestation_id).toLowerCase() as Hex,
    type: "contribution",
    claim: decoded.claim,
    evidence: decoded.evidence,
    issued_at: Number(decoded.issued_at),
    status: decoded.status === ATTESTATION_STATUS_REVOKED
      ? ATTESTATION_STATUS_REVOKED
      : ATTESTATION_STATUS_VALID,
    revoked_at: Number(decoded.revoked_at),
  };

  if (decoded.version !== 1) {
    throw new AttestationCodecError(`Unsupported version: ${decoded.version}. Expected version 1.`);
  }

  validateAttestationData(data);
  return data;
}

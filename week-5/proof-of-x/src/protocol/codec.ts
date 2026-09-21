// Codec for OnChainAttestationData — JSON encoded as UTF-8 hex in cell data.

import { bytesFrom, bytesTo, Hex, hexFrom } from "@ckb-ccc/core";
import {
  ATTESTATION_STATUS_REVOKED,
  ATTESTATION_STATUS_VALID,
  OnChainAttestationData,
} from "./types";

export const MAX_CLAIM_LENGTH = 120;
export const MAX_EVIDENCE_LENGTH = 150;

export class AttestationCodecError extends Error {
  constructor(message: string) {
    super(`[AttestationCodec] ${message}`);
    this.name = "AttestationCodecError";
  }
}


export function validateAttestationData(data: OnChainAttestationData): void {
  if (data.version !== 1) {
    throw new AttestationCodecError(`Unsupported version: ${data.version}. Expected version 1.`);
  }

  if (data.type !== "contribution") {
    throw new AttestationCodecError(`Unsupported attestation type: ${data.type}. Expected "contribution".`);
  }

  if (!data.attestation_id || !/^0x[0-9a-fA-F]{64}$/.test(data.attestation_id)) {
    throw new AttestationCodecError(`Invalid attestation_id format. Must be 32-byte hex (66 characters with 0x). Got: ${data.attestation_id}`);
  }

  if (!data.claim || typeof data.claim !== "string") {
    throw new AttestationCodecError("Claim is required and must be a string.");
  }

  if (data.claim.length > MAX_CLAIM_LENGTH) {
    throw new AttestationCodecError(`Claim exceeds maximum allowed length of ${MAX_CLAIM_LENGTH} characters (length: ${data.claim.length}).`);
  }

  if (data.evidence && typeof data.evidence === "string" && data.evidence.length > MAX_EVIDENCE_LENGTH) {
    throw new AttestationCodecError(`Evidence URL exceeds maximum allowed length of ${MAX_EVIDENCE_LENGTH} characters (length: ${data.evidence.length}).`);
  }

  if (data.status !== ATTESTATION_STATUS_VALID && data.status !== ATTESTATION_STATUS_REVOKED) {
    throw new AttestationCodecError(`Invalid status: ${data.status}. Allowed values: 0 (VALID), 1 (REVOKED).`);
  }

  if (typeof data.issued_at !== "number" || data.issued_at <= 0) {
    throw new AttestationCodecError(`Invalid issued_at timestamp: ${data.issued_at}`);
  }

  if (data.status === ATTESTATION_STATUS_REVOKED && (!data.revoked_at || data.revoked_at <= 0)) {
    throw new AttestationCodecError("revoked_at timestamp is required when status is REVOKED (1).");
  }
}


export function encodeAttestationData(data: OnChainAttestationData): Hex {
  validateAttestationData(data);

  const cleanObject: OnChainAttestationData = {
    version: 1,
    attestation_id: data.attestation_id.toLowerCase() as Hex,
    type: "contribution",
    claim: data.claim.trim(),
    evidence: data.evidence?.trim() || undefined,
    issued_at: Math.floor(data.issued_at),
    status: data.status,
    revoked_at: data.revoked_at ? Math.floor(data.revoked_at) : undefined,
  };

  const jsonString = JSON.stringify(cleanObject);
  const bytes = new TextEncoder().encode(jsonString);
  return hexFrom(bytes);
}


export function decodeAttestationData(rawHex: Hex): OnChainAttestationData {
  if (!rawHex || rawHex === "0x") {
    throw new AttestationCodecError("Empty cell data provided.");
  }

  try {
    const bytes = bytesFrom(rawHex);
    const jsonString = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonString) as OnChainAttestationData;
    validateAttestationData(parsed);
    return parsed;
  } catch (err: unknown) {
    if (err instanceof AttestationCodecError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new AttestationCodecError(`Failed to decode cell data: ${message}`);
  }
}

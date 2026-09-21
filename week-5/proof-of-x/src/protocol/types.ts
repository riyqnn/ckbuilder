/**
 * Proof of X - Protocol Types & Interfaces
 * Final Hardened Specification (Week 5)
 */

import { Hex } from "@ckb-ccc/core";

export type AttestationStatus = 0 | 1; // 0 = valid, 1 = revoked
export const ATTESTATION_STATUS_VALID: AttestationStatus = 0;
export const ATTESTATION_STATUS_REVOKED: AttestationStatus = 1;

export interface OnChainAttestationData {
  version: 1;
  attestation_id: Hex; // 0x-prefixed 32-byte hex (66 chars)
  type: "contribution"; // fixed MVP type
  claim: string; // short plaintext, max 120 chars
  evidence?: string; // optional short URL, max 150 chars
  issued_at: number; // block number or unix timestamp (seconds)
  status: AttestationStatus; // 0 = valid, 1 = revoked
  revoked_at?: number; // block number or unix timestamp (seconds)
}

export interface AttestationCellInfo {
  outPoint: {
    txHash: Hex;
    index: number;
  };
  capacity: bigint;
  holderLock: {
    codeHash: Hex;
    hashType: "type" | "data" | "data1" | "data2";
    args: Hex;
  };
  typeScript: {
    codeHash: Hex;
    hashType: "type" | "data" | "data1" | "data2";
    args: Hex;
  };
  data: OnChainAttestationData;
  rawHexData: Hex;
  blockNumber?: number;
}

export interface VerificationCheck {
  id: string;
  name: string;
  passed: boolean;
  severity: "critical" | "warning";
  detail: string;
  onChainReference?: {
    label: string;
    value: string;
    url?: string;
  };
}

export interface VerificationReport {
  attestationId: Hex;
  isValid: boolean;
  status: "VALID" | "REVOKED" | "NOT_FOUND" | "CORRUPTED";
  timestamp: number;
  checks: VerificationCheck[];
  cellInfo?: AttestationCellInfo;
  failureReason?: string;
}

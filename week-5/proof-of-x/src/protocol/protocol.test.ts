import { Hex } from "@ckb-ccc/core";
import {
  decodeAttestationData,
  encodeAttestationData,
  MAX_CLAIM_LENGTH,
  MAX_EVIDENCE_LENGTH,
} from "./codec";
import { generateAttestationId } from "./id";
import {
  ATTESTATION_STATUS_REVOKED,
  ATTESTATION_STATUS_VALID,
  OnChainAttestationData,
} from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export function runProtocolTests() {
  console.log("=== Proof of X Protocol Tests ===");

  // Test 1: deterministic ID generation
  const dummyOutPoint = {
    txHash: "0xcfad415c6c746d8928aa7bc3b7d51b289dc272519c42d67a3cd88ba8b1dc3005" as Hex,
    index: 1,
  };
  const id1 = generateAttestationId(dummyOutPoint);
  const id2 = generateAttestationId(dummyOutPoint);
  assert(id1 === id2, "ID must be deterministic for same OutPoint");
  assert(id1.startsWith("0x") && id1.length === 66, "ID must be 32-byte hex");
  console.log("[PASS] Test 1: Deterministic attestation_id ->", id1);

  // Test 2: codec roundtrip
  const validData: OnChainAttestationData = {
    version: 1,
    attestation_id: id1,
    type: "contribution",
    claim: "Core contributor to CKB ecosystem open source tooling",
    evidence: "https://github.com/nervosnetwork/ckb",
    issued_at: 1726700000,
    status: ATTESTATION_STATUS_VALID,
  };

  const encoded = encodeAttestationData(validData);
  assert(encoded.startsWith("0x"), "Encoded output must be 0x-prefixed hex");

  const decoded = decodeAttestationData(encoded);
  assert(decoded.version === 1, "Decoded version must match");
  assert(decoded.attestation_id === id1, "Decoded attestation_id must match");
  assert(decoded.claim === validData.claim, "Decoded claim must match");
  assert(decoded.evidence === validData.evidence, "Decoded evidence must match");
  assert(decoded.status === ATTESTATION_STATUS_VALID, "Decoded status must be VALID");
  console.log("[PASS] Test 2: Codec roundtrip");

  // Test 3a: claim length bound
  try {
    encodeAttestationData({ ...validData, claim: "a".repeat(MAX_CLAIM_LENGTH + 1) });
    assert(false, "Should have thrown for claim exceeding max length");
  } catch (e: any) {
    assert(e.name === "AttestationCodecError", "Expected AttestationCodecError");
    console.log("[PASS] Test 3a: Max claim length enforced");
  }

  // Test 3b: evidence length bound
  try {
    encodeAttestationData({ ...validData, evidence: "https://" + "b".repeat(MAX_EVIDENCE_LENGTH) });
    assert(false, "Should have thrown for evidence exceeding max length");
  } catch (e: any) {
    assert(e.name === "AttestationCodecError", "Expected AttestationCodecError");
    console.log("[PASS] Test 3b: Max evidence length enforced");
  }

  // Test 4: revocation preserves immutable fields
  const revokedData: OnChainAttestationData = {
    ...validData,
    status: ATTESTATION_STATUS_REVOKED,
    revoked_at: 1726800000,
  };

  const encodedRevoked = encodeAttestationData(revokedData);
  const decodedRevoked = decodeAttestationData(encodedRevoked);

  assert(decodedRevoked.status === ATTESTATION_STATUS_REVOKED, "Status must be REVOKED");
  assert(decodedRevoked.revoked_at === 1726800000, "revoked_at must be preserved");
  assert(decodedRevoked.attestation_id === validData.attestation_id, "attestation_id must not change");
  assert(decodedRevoked.claim === validData.claim, "claim must not change");
  console.log("[PASS] Test 4: Revocation immutability");

  console.log("All tests passed.");
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.endsWith("protocol.test.ts")) {
  runProtocolTests();
}

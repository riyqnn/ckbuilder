import { Hex } from "@ckb-ccc/core";
import {
  AttestationCodecError,
  MAX_CLAIM_LENGTH,
  MAX_EVIDENCE_LENGTH,
  decodeAttestationData,
  encodeAttestationData,
  utf8Length,
} from "./codec";
import { generateAttestationId } from "./id";
import { DEFAULT_PROTOCOL_CONFIG } from "./config";
import {
  ISSUER_LOCK_HASH_OFFSET,
  TYPE_ARGS_LENGTH,
  buildAttestationTypeScript,
  issuerLockHashFromArgs,
  poxCodeHashFromArgs,
} from "./script";
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

function byteLength(hex: Hex): number {
  return (hex.length - 2) / 2;
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
    revoked_at: 0,
  };

  const encoded = encodeAttestationData(validData);
  assert(encoded.startsWith("0x"), "Encoded output must be 0x-prefixed hex");

  const decoded = decodeAttestationData(encoded);
  assert(decoded.version === 1, "Decoded version must match");
  assert(decoded.attestation_id === id1, "Decoded attestation_id must match");
  assert(decoded.claim === validData.claim, "Decoded claim must match");
  assert(decoded.evidence === validData.evidence, "Decoded evidence must match");
  assert(decoded.issued_at === validData.issued_at, "Decoded issued_at must match");
  assert(decoded.status === ATTESTATION_STATUS_VALID, "Decoded status must be VALID");
  assert(decoded.revoked_at === 0, "Decoded revoked_at must be 0 while VALID");
  console.log("[PASS] Test 2: Molecule codec roundtrip");

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

  // Test 3c: bounds are counted in UTF-8 bytes, not UTF-16 units. A 61-character
  // claim of 2-byte characters is 122 bytes and must be rejected, even though
  // String.length says 61.
  const multiByteClaim = "é".repeat(61);
  assert(multiByteClaim.length === 61, "multi-byte claim should be 61 UTF-16 units");
  assert(utf8Length(multiByteClaim) === 122, "multi-byte claim should be 122 UTF-8 bytes");
  try {
    encodeAttestationData({ ...validData, claim: multiByteClaim });
    assert(false, "Should have thrown for a claim over the byte bound");
  } catch (e: any) {
    assert(e instanceof AttestationCodecError, "Expected AttestationCodecError");
    console.log("[PASS] Test 3c: Bounds counted in UTF-8 bytes, not UTF-16 units");
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

  // Test 5: the length invariant the on-chain capacity rule depends on. Under the
  // Week 5 JSON codec these were 269 and 293 bytes, so a revoke that preserved
  // capacity produced an under-capacitated cell.
  assert(byteLength(encoded) === 184, `VALID payload must be 184 bytes, got ${byteLength(encoded)}`);
  assert(
    byteLength(encodedRevoked) === byteLength(encoded),
    `REVOKED payload must match VALID length, got ${byteLength(encodedRevoked)}`,
  );
  console.log("[PASS] Test 5: VALID and REVOKED both encode to 184 bytes");

  // Test 6: only status and revoked_at may differ on the wire. Everything else
  // must be byte-identical, which is the property the Type Script relies on.
  const OFF_STATUS = 70;
  const OFF_ISSUED_AT = 71;
  const OFF_REVOKED_AT = 79;
  const OFF_CLAIM = 87;
  const a = encoded.slice(2);
  const b = encodedRevoked.slice(2);
  const span = (hex: string, from: number, to: number) => hex.slice(from * 2, to * 2);
  assert(span(a, 0, OFF_STATUS) === span(b, 0, OFF_STATUS), "bytes before status must be identical");
  assert(
    span(a, OFF_ISSUED_AT, OFF_REVOKED_AT) === span(b, OFF_ISSUED_AT, OFF_REVOKED_AT),
    "issued_at must be identical",
  );
  assert(span(a, OFF_CLAIM, 184) === span(b, OFF_CLAIM, 184), "claim and evidence must be identical");
  assert(span(a, OFF_STATUS, OFF_ISSUED_AT) !== span(b, OFF_STATUS, OFF_ISSUED_AT), "status must differ");
  console.log("[PASS] Test 6: Immutable byte ranges hold across VALID -> REVOKED");

  // Test 7: ckb-js-vm type script args layout
  const issuerLockHash = DEFAULT_PROTOCOL_CONFIG.authorizedIssuerLockHash;
  const typeScript = buildAttestationTypeScript(issuerLockHash);
  assert(
    byteLength(typeScript.args as Hex) === TYPE_ARGS_LENGTH,
    `Type args must be ${TYPE_ARGS_LENGTH} bytes, got ${byteLength(typeScript.args as Hex)}`,
  );
  assert(
    typeScript.codeHash.toLowerCase() === DEFAULT_PROTOCOL_CONFIG.jsVm.codeHash.toLowerCase(),
    "Type script code hash must be ckb-js-vm",
  );
  assert(
    poxCodeHashFromArgs(typeScript.args as Hex)?.toLowerCase() ===
      DEFAULT_PROTOCOL_CONFIG.pox.codeHash.toLowerCase(),
    "Args must name the deployed Proof of X bytecode",
  );
  assert(
    issuerLockHashFromArgs(typeScript.args as Hex)?.toLowerCase() === issuerLockHash.toLowerCase(),
    `Issuer lock hash must sit at byte offset ${ISSUER_LOCK_HASH_OFFSET}`,
  );
  console.log("[PASS] Test 7: Type script args are 67 bytes, jsVm + pox + issuer");

  // Test 8: the placeholder config that Week 5 shipped must not come back. It was
  // an ASCII string dressed up as a code hash.
  assert(
    !DEFAULT_PROTOCOL_CONFIG.pox.codeHash.startsWith("0x546573746e6574"),
    "pox code hash must not be the Week 5 ASCII placeholder",
  );
  assert(
    DEFAULT_PROTOCOL_CONFIG.authorizedIssuerLockHash !==
      "0x9337388cc9779b6a5a15d22ad4060777c380e0b23fe7339703a837e61899f8ec",
    "issuer lock hash must not be the Week 3 deploy transaction hash",
  );
  console.log("[PASS] Test 8: No placeholder values left in protocol config");

  console.log("All tests passed.");
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.endsWith("protocol.test.ts")) {
  runProtocolTests();
}

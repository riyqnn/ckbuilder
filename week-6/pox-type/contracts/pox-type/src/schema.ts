// Molecule reader for the attestation cell data. Mirrors schema/pox.mol.
//
// Hand-written rather than using `mol` from @ckb-js-std/core, and that is a
// capacity decision, not a style one. Measured bytecode for identical logic:
//
//   HighLevel + mol   29,810 bytes  ->  29,810 CKB locked in the code cell
//   mol, no HighLevel 15,319 bytes  ->  15,319 CKB
//   this file          ~1,640 bytes  ->   ~1,640 CKB
//
// On CKB a byte of script is a byte of permanently occupied capacity, so an SDK
// import has a price in CKB. The deployer wallet holds 11,810 CKB; the first two
// options are simply unaffordable.
//
// A molecule `table` is: full_size (u32 LE), then one u32 LE offset per field,
// then the field bodies in order. With every field either fixed-size or a
// byteVec, all offsets but the last are constant:
//
//   [ 0, 4)   full_size
//   [ 4,36)   8 offsets
//   [36,37)   version         byte
//   [37,69)   attestation_id  Byte32
//   [69,70)   kind            byte
//   [70,71)   status          byte
//   [71,79)   issued_at       Uint64 LE
//   [79,87)   revoked_at      Uint64 LE
//   [87, ..)  claim           u32 LE length + utf8 bytes
//   [  .., n) evidence        u32 LE length + utf8 bytes
//
// parse() rejects anything that is not in exactly this canonical form. That is
// what lets revoke compare immutable fields as three byte ranges instead of
// field by field: everything outside `status` and `revoked_at` must be
// byte-identical, so no field can be forgotten.

export const OFF_VERSION = 36;
export const OFF_ID = 37;
export const OFF_KIND = 69;
export const OFF_STATUS = 70;
export const OFF_ISSUED_AT = 71;
export const OFF_REVOKED_AT = 79;
export const OFF_CLAIM = 87;

const HEADER_SIZE = 36;
const FIXED_OFFSETS = [36, 37, 69, 70, 71, 79, 87];
const MIN_SIZE = OFF_CLAIM + 4 + 4; // both byteVecs empty

export const VERSION = 1;
export const KIND_CONTRIBUTION = 0;
export const STATUS_VALID = 0;
export const STATUS_REVOKED = 1;

export const MAX_CLAIM_BYTES = 120;
export const MAX_EVIDENCE_BYTES = 150;

export interface Attestation {
  version: number;
  kind: number;
  status: number;
  attestationId: ArrayBuffer;
  issuedAtIsZero: boolean;
  revokedAtIsZero: boolean;
  claimLength: number;
  evidenceLength: number;
}

function spanIsZero(u8: Uint8Array, offset: number, length: number): boolean {
  // Avoids DataView.getBigUint64: BigInt support is not worth pulling in just to
  // compare a timestamp against zero.
  for (let i = 0; i < length; i++) {
    if (u8[offset + i] !== 0) return false;
  }
  return true;
}

/** Returns null when `buf` is not canonical AttestationData. */
export function parse(buf: ArrayBuffer): Attestation | null {
  const size = buf.byteLength;
  if (size < MIN_SIZE) return null;

  const view = new DataView(buf);
  if (view.getUint32(0, true) !== size) return null;

  for (let i = 0; i < FIXED_OFFSETS.length; i++) {
    if (view.getUint32(4 + i * 4, true) !== FIXED_OFFSETS[i]) return null;
  }

  const claimLength = view.getUint32(OFF_CLAIM, true);
  const evidenceOffset = OFF_CLAIM + 4 + claimLength;
  if (evidenceOffset + 4 > size) return null;
  if (view.getUint32(HEADER_SIZE - 4, true) !== evidenceOffset) return null;

  const evidenceLength = view.getUint32(evidenceOffset, true);
  if (evidenceOffset + 4 + evidenceLength !== size) return null;

  const u8 = new Uint8Array(buf);
  return {
    version: u8[OFF_VERSION],
    kind: u8[OFF_KIND],
    status: u8[OFF_STATUS],
    attestationId: buf.slice(OFF_ID, OFF_ID + 32),
    issuedAtIsZero: spanIsZero(u8, OFF_ISSUED_AT, 8),
    revokedAtIsZero: spanIsZero(u8, OFF_REVOKED_AT, 8),
    claimLength,
    evidenceLength,
  };
}

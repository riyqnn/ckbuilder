// Proof of X - attestation Type Script.
//
// Enforces the whole attestation lifecycle on-chain. The dApp is never the
// authority: it can only build transactions this script is willing to accept.
//
// Type script args (67 bytes):
//   0x0000 | pox_code_hash (32) | hash_type (1) | issuer_lock_hash (32)
//   \_ the first 35 bytes are consumed by ckb-js-vm to locate this bytecode;
//      everything after is ours.
//
// Transaction shapes, counted over this script's own group:
//   0 in -> 1 out   ISSUE
//   1 in -> 1 out   REVOKE
//   1 in -> 0 out   BURN
//   anything else   rejected
//
// A CKB script group is keyed on the full script hash, args included, so a cell
// can never move to a different issuer_lock_hash inside one group. A transaction
// that rewrites the args splits into two groups instead: the old one takes the
// BURN path (needs the old issuer), the new one takes the ISSUE path (needs
// status VALID and a freshly derived attestation_id). Neither smuggles a REVOKED
// state under new args, so args immutability needs no explicit check.
//
// Only `bindings` and `hashCkb` are imported. See schema.ts for why: every
// bundled byte is a byte of permanently locked cell capacity.

import * as bindings from '@ckb-js-std/bindings';
import { hashCkb } from '@ckb-js-std/core';
import {
  Attestation,
  KIND_CONTRIBUTION,
  MAX_CLAIM_BYTES,
  MAX_EVIDENCE_BYTES,
  OFF_CLAIM,
  OFF_ISSUED_AT,
  OFF_REVOKED_AT,
  OFF_STATUS,
  STATUS_REVOKED,
  STATUS_VALID,
  VERSION,
  parse,
} from './schema';

const ERR_ENCODING = 1;
const ERR_ARGS_LENGTH = 2;
const ERR_UNAUTH = 3;
const ERR_BAD_ISSUE = 4;
const ERR_BAD_ID = 5;
const ERR_BAD_TRANSITION = 6;
const ERR_IMMUTABLE = 7;
const ERR_HOLDER_CHANGED = 8;
const ERR_BAD_GROUP = 9;

const ARGS_LENGTH = 67;
const ISSUER_LOCK_HASH_OFFSET = 35;

function fail(code: number): never {
  bindings.exit(code);
  throw new Error('unreachable');
}

function bytesEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== y[i]) return false;
  }
  return true;
}

/** args of this script, read out of the serialized molecule Script. */
function loadOwnArgs(): ArrayBuffer {
  // Script is table { code_hash: Byte32, hash_type: byte, args: Bytes };
  // the offset of field 2 lives at 4 + 2 * 4.
  const script = bindings.loadScript();
  const view = new DataView(script);
  const argsOffset = view.getUint32(12, true);
  const argsLength = view.getUint32(argsOffset, true);
  return script.slice(argsOffset + 4, argsOffset + 4 + argsLength);
}

function isIndexOutOfBound(err: unknown): boolean {
  return (err as { errorCode?: number }).errorCode === bindings.INDEX_OUT_OF_BOUND;
}

/** Capacity (raw 8-byte LE) of every cell this script guards, in order. */
function groupCapacities(source: number | bigint): ArrayBuffer[] {
  const capacities: ArrayBuffer[] = [];
  for (let i = 0; ; i++) {
    try {
      capacities.push(bindings.loadCellByField(i, source, bindings.CELL_FIELD_CAPACITY));
    } catch (err) {
      if (isIndexOutOfBound(err)) return capacities;
      throw err;
    }
  }
}

/** a >= b for two 8-byte little-endian capacities. */
function capacityAtLeast(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  for (let i = 7; i >= 0; i--) {
    if (x[i] !== y[i]) return x[i] > y[i];
  }
  return true;
}

/** True when some input cell is unlocked by the authorized issuer. */
function issuerSigned(issuerLockHash: ArrayBuffer): boolean {
  for (let i = 0; ; i++) {
    let lockHash: ArrayBuffer;
    try {
      lockHash = bindings.loadCellByField(
        i,
        bindings.SOURCE_INPUT,
        bindings.CELL_FIELD_LOCK_HASH,
      );
    } catch (err) {
      if (isIndexOutOfBound(err)) return false;
      throw err;
    }
    if (bytesEqual(lockHash, issuerLockHash)) return true;
  }
}

function lockHashOf(index: number, source: number | bigint): ArrayBuffer {
  return bindings.loadCellByField(index, source, bindings.CELL_FIELD_LOCK_HASH);
}

function loadData(index: number, source: number | bigint): ArrayBuffer {
  return bindings.loadCellData(index, source);
}

function parseOrFail(raw: ArrayBuffer): Attestation {
  const parsed = parse(raw);
  if (parsed === null) fail(ERR_ENCODING);
  return parsed;
}

function checkIssue(raw: ArrayBuffer): void {
  const out = parseOrFail(raw);

  if (
    out.version !== VERSION ||
    out.kind !== KIND_CONTRIBUTION ||
    out.status !== STATUS_VALID ||
    !out.revokedAtIsZero ||
    out.issuedAtIsZero ||
    out.claimLength === 0 ||
    out.claimLength > MAX_CLAIM_BYTES ||
    out.evidenceLength > MAX_EVIDENCE_BYTES
  ) {
    fail(ERR_BAD_ISSUE);
  }

  // attestation_id is bound to an OutPoint, which can only ever be spent once,
  // so the identifier is globally unique and cannot be replayed.
  const outPoint = bindings.loadInputByField(
    0,
    bindings.SOURCE_INPUT,
    bindings.INPUT_FIELD_OUT_POINT,
  );
  if (!bytesEqual(out.attestationId, hashCkb(outPoint))) {
    fail(ERR_BAD_ID);
  }
}

function checkRevoke(inputRaw: ArrayBuffer, outputRaw: ArrayBuffer): void {
  const inp = parseOrFail(inputRaw);
  const out = parseOrFail(outputRaw);

  if (inp.status !== STATUS_VALID || out.status !== STATUS_REVOKED || out.revokedAtIsZero) {
    fail(ERR_BAD_TRANSITION);
  }

  // Canonical fixed-layout encoding means "every immutable field is unchanged"
  // reduces to "every byte outside status and revoked_at is unchanged". No field
  // can be left out of this check by accident.
  const spans: [number, number][] = [
    [0, OFF_STATUS],
    [OFF_ISSUED_AT, OFF_REVOKED_AT],
    [OFF_CLAIM, inputRaw.byteLength],
  ];
  for (const [from, to] of spans) {
    if (!bytesEqual(inputRaw.slice(from, to), outputRaw.slice(from, to))) {
      fail(ERR_IMMUTABLE);
    }
  }
}

function main(): number {
  const args = loadOwnArgs();
  if (args.byteLength !== ARGS_LENGTH) {
    fail(ERR_ARGS_LENGTH);
  }
  const issuerLockHash = args.slice(ISSUER_LOCK_HASH_OFFSET, ARGS_LENGTH);

  // Issue, revoke and burn are all issuer-authorized, so establish it once.
  if (!issuerSigned(issuerLockHash)) {
    fail(ERR_UNAUTH);
  }

  const inCapacities = groupCapacities(bindings.SOURCE_GROUP_INPUT);
  const outCapacities = groupCapacities(bindings.SOURCE_GROUP_OUTPUT);
  const nIn = inCapacities.length;
  const nOut = outCapacities.length;

  if (nIn === 0 && nOut === 1) {
    checkIssue(loadData(0, bindings.SOURCE_GROUP_OUTPUT));
    return 0;
  }

  if (nIn === 1 && nOut === 1) {
    checkRevoke(
      loadData(0, bindings.SOURCE_GROUP_INPUT),
      loadData(0, bindings.SOURCE_GROUP_OUTPUT),
    );

    // The holder keeps the cell, and keeps its capacity: revoking must not let
    // the issuer move the cell or skim capacity off it.
    if (
      !bytesEqual(
        lockHashOf(0, bindings.SOURCE_GROUP_INPUT),
        lockHashOf(0, bindings.SOURCE_GROUP_OUTPUT),
      ) ||
      !capacityAtLeast(outCapacities[0], inCapacities[0])
    ) {
      fail(ERR_HOLDER_CHANGED);
    }
    return 0;
  }

  if (nIn === 1 && nOut === 0) {
    // Burn. Issuer authorization is already established; reclaiming the capacity
    // of a dead attestation needs nothing further.
    return 0;
  }

  return fail(ERR_BAD_GROUP);
}

bindings.exit(main());

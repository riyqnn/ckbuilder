// Shared scenario builders for the pox-type mock tests.
//
// Cell data is encoded here with `mol` from @ckb-ccc/core — the same codec the
// dApp uses — while the Type Script decodes it with the hand-written reader in
// contracts/pox-type/src/schema.ts. Every passing test is therefore a
// cross-implementation check of schema/pox.mol, run inside CKB-VM.

import {
  Hex,
  Script,
  Transaction,
  bytesConcat,
  hashCkb,
  hashTypeToBytes,
  hexFrom,
  mol,
  numLeToBytes,
} from '@ckb-ccc/core';
import { readFileSync } from 'fs';
import {
  DEFAULT_SCRIPT_ALWAYS_SUCCESS,
  DEFAULT_SCRIPT_CKB_JS_VM,
  Resource,
} from 'ckb-testtool';

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

export const STATUS_VALID = 0;
export const STATUS_REVOKED = 1;

export const CLAIM = 'Core contributor to CKB ecosystem open source tooling';
export const EVIDENCE = 'https://github.com/nervosnetwork/ckb';
export const ISSUED_AT = 1726700000n;
export const REVOKED_AT = 1726800000n;

/**
 * 500 CKB. Comfortably above the 326 CKB the cell actually occupies, which the
 * capacity-skim test needs: ccc's JsonRpcTransformers raises an
 * under-capacitated output to its occupied minimum, so a skim is only
 * observable between two values that are both already above it.
 */
const CELL_CAPACITY = 50_000_000_000n;

export interface Attestation {
  version?: number;
  attestation_id: Hex;
  kind?: number;
  status: number;
  issued_at?: bigint;
  revoked_at?: bigint;
  claim?: string;
  evidence?: string;
}

export function encode(a: Attestation): Hex {
  return hexFrom(
    AttestationData.encode({
      version: a.version ?? 1,
      attestation_id: a.attestation_id,
      kind: a.kind ?? 0,
      status: a.status,
      issued_at: a.issued_at ?? ISSUED_AT,
      revoked_at: a.revoked_at ?? 0n,
      claim: a.claim ?? CLAIM,
      evidence: a.evidence ?? EVIDENCE,
    }),
  );
}

/** attestation_id = hashCkb(txHash || index u32 LE) — mirrors protocol/id.ts. */
export function attestationIdFrom(txHash: Hex, index: number | bigint): Hex {
  return hashCkb(bytesConcat(txHash, hexFrom(numLeToBytes(Number(index), 4))));
}

export interface Scene {
  resource: Resource;
  tx: Transaction;
  /** The attestation Type Script: ckb-js-vm, args carrying the issuer lock hash. */
  attestationType: Script;
  issuerLock: Script;
  holderLock: Script;
  outsiderLock: Script;
}

/**
 * Deploys ckb-js-vm, always-success and the pox-type bytecode, then derives three
 * distinct locks from always-success by varying its args.
 */
export function setup(): Scene {
  const resource = Resource.default();
  const tx = Transaction.default();

  const jsVm = resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_CKB_JS_VM)), tx, false);
  const alwaysSuccess = resource.deployCell(
    hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)),
    tx,
    false,
  );
  const poxType = resource.deployCell(hexFrom(readFileSync('dist/pox-type.bc')), tx, false);

  const lockWithArgs = (args: Hex) =>
    Script.from({ codeHash: alwaysSuccess.codeHash, hashType: alwaysSuccess.hashType, args });

  const issuerLock = lockWithArgs('0x01');
  const holderLock = lockWithArgs('0x02');
  const outsiderLock = lockWithArgs('0x03');

  const attestationType = Script.from({
    codeHash: jsVm.codeHash,
    hashType: jsVm.hashType,
    args: hexFrom(
      '0x0000' +
        poxType.codeHash.slice(2) +
        hexFrom(hashTypeToBytes(poxType.hashType)).slice(2) +
        issuerLock.hash().slice(2),
    ),
  });

  return { resource, tx, attestationType, issuerLock, holderLock, outsiderLock };
}

/** Adds a plain funding input under `lock` and returns its OutPoint. */
export function addFundingInput(scene: Scene, lock: Script) {
  const cell = scene.resource.mockCell(lock, undefined, '0x', CELL_CAPACITY);
  const input = Resource.createCellInput(cell);
  scene.tx.inputs.push(input);
  return input.previousOutput;
}

/** Adds a live attestation cell as an input, held by `holderLock`. */
export function addAttestationInput(scene: Scene, data: Hex, lock: Script = scene.holderLock) {
  const cell = scene.resource.mockCell(lock, scene.attestationType, data, CELL_CAPACITY);
  scene.tx.inputs.push(Resource.createCellInput(cell));
}

/** Adds an attestation cell as an output, held by `holderLock`. */
export function addAttestationOutput(
  scene: Scene,
  data: Hex,
  lock: Script = scene.holderLock,
  capacity: bigint = CELL_CAPACITY,
) {
  scene.tx.outputs.push(Resource.createCellOutput(lock, scene.attestationType, capacity));
  scene.tx.outputsData.push(data);
}

/** Adds a plain change output, so burn transactions are not empty. */
export function addChangeOutput(scene: Scene, lock: Script) {
  scene.tx.outputs.push(Resource.createCellOutput(lock, undefined, CELL_CAPACITY));
  scene.tx.outputsData.push('0x');
}

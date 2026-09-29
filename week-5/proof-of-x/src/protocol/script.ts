/**
 * Proof of X - Type Script construction.
 *
 * ckb-js-vm reads the first 35 bytes of its args to find the JavaScript bytecode
 * to run, and hands everything after to the script itself:
 *
 *   0x0000 | pox_code_hash (32) | hash_type (1) | issuer_lock_hash (32)
 *   \____/   \_____________________________________/ \_________________/
 *   flags        consumed by ckb-js-vm                 read by our script
 *
 * Getting these 67 bytes wrong is not a frontend bug that degrades gracefully:
 * either ckb-js-vm cannot find the code, or the script reads the wrong issuer.
 */

import { CellDepLike, Hex, Script, hashTypeToBytes, hexFrom } from "@ckb-ccc/core";
import { DEFAULT_PROTOCOL_CONFIG, ProtocolConfig } from "./config";

export const TYPE_ARGS_LENGTH = 67;
export const ISSUER_LOCK_HASH_OFFSET = 35;

export function buildAttestationTypeScript(
  issuerLockHash: Hex,
  config: ProtocolConfig = DEFAULT_PROTOCOL_CONFIG,
): Script {
  const args = hexFrom(
    "0x0000" +
      config.pox.codeHash.slice(2) +
      hexFrom(hashTypeToBytes(config.pox.hashType)).slice(2) +
      issuerLockHash.slice(2),
  );

  if ((args.length - 2) / 2 !== TYPE_ARGS_LENGTH) {
    throw new Error(
      `Attestation type args must be ${TYPE_ARGS_LENGTH} bytes, got ${(args.length - 2) / 2}`,
    );
  }

  return Script.from({
    codeHash: config.jsVm.codeHash,
    hashType: config.jsVm.hashType,
    args,
  });
}

/** Both the interpreter and the validator bytecode have to be in scope. */
export function attestationCellDeps(
  config: ProtocolConfig = DEFAULT_PROTOCOL_CONFIG,
): CellDepLike[] {
  return [config.jsVm.cellDep, config.pox.cellDep];
}

/** Reads the issuer this cell's type script was locked to at issue time. */
export function issuerLockHashFromArgs(args: Hex): Hex | null {
  if ((args.length - 2) / 2 !== TYPE_ARGS_LENGTH) return null;
  return `0x${args.slice(2).slice(ISSUER_LOCK_HASH_OFFSET * 2)}` as Hex;
}

/** Reads the validator bytecode this cell's type script was bound to. */
export function poxCodeHashFromArgs(args: Hex): Hex | null {
  if ((args.length - 2) / 2 !== TYPE_ARGS_LENGTH) return null;
  return `0x${args.slice(2).slice(4, 4 + 64)}` as Hex;
}

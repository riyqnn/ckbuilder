// attestation_id = hashCkb(firstInput.txHash || numLeToBytes(firstInput.index, 4))
// OutPoint can only be consumed once, so the ID is globally unique.

import { bytesConcat, hashCkb, Hex, hexFrom, numLeToBytes } from "@ckb-ccc/core";

export interface OutPointLike {
  txHash: Hex;
  index: number | bigint;
}

export function generateAttestationId(firstInputOutPoint: OutPointLike): Hex {
  const txHashClean = firstInputOutPoint.txHash.startsWith("0x")
    ? firstInputOutPoint.txHash
    : (`0x${firstInputOutPoint.txHash}` as Hex);

  const indexBytes = numLeToBytes(Number(firstInputOutPoint.index), 4);
  const outPointBytes = bytesConcat(txHashClean, hexFrom(indexBytes));
  return hashCkb(outPointBytes).toLowerCase() as Hex;
}

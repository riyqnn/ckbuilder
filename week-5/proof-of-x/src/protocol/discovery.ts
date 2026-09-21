/**
 * Proof of X - On-chain Live Cell Discovery
 *
 * Implements querying the CKB node indexer to resolve:
 * attestation_id -> current live Cell -> verify state
 */

import { Client, Hex, Script } from "@ckb-ccc/core";
import { decodeAttestationData } from "./codec";
import { DEFAULT_PROTOCOL_CONFIG, ProtocolConfig } from "./config";
import { AttestationCellInfo } from "./types";

export interface DiscoverAttestationParams {
  client: Client;
  attestationId: Hex;
  config?: ProtocolConfig;
}

/**
 * Discovers the current live cell matching an attestation_id.
 */
export async function discoverLiveAttestationCell(
  params: DiscoverAttestationParams
): Promise<AttestationCellInfo | null> {
  const config = params.config ?? DEFAULT_PROTOCOL_CONFIG;
  const { client, attestationId } = params;

  const targetId = attestationId.toLowerCase();

  // Search by Type Script with codeHash & hashType
  // Search query via client.findCells
  const typeFilter = new Script(
    config.typeScriptCodeHash,
    config.typeScriptHashType,
    "0x" // match any issuer args or specific
  );

  try {
    for await (const cell of client.findCells({
      script: typeFilter,
      scriptType: "type",
      scriptSearchMode: "prefix",
    })) {
      if (!cell.outputData || cell.outputData === "0x") {
        continue;
      }

      try {
        const decoded = decodeAttestationData(cell.outputData as Hex);
        if (decoded.attestation_id.toLowerCase() === targetId) {
          return {
            outPoint: {
              txHash: cell.outPoint.txHash,
              index: Number(cell.outPoint.index),
            },
            capacity: cell.cellOutput.capacity,
            holderLock: {
              codeHash: cell.cellOutput.lock.codeHash,
              hashType: cell.cellOutput.lock.hashType,
              args: cell.cellOutput.lock.args,
            },
            typeScript: {
              codeHash: cell.cellOutput.type?.codeHash ?? "0x",
              hashType: cell.cellOutput.type?.hashType ?? "type",
              args: cell.cellOutput.type?.args ?? "0x",
            },
            data: decoded,
            rawHexData: cell.outputData as Hex,
          };
        }
      } catch {
        // Skip unparseable non-attestation cells sharing the prefix
        continue;
      }
    }
  } catch (err) {
    console.warn("[Discovery] Direct indexer query fallback:", err);
  }

  return null;
}

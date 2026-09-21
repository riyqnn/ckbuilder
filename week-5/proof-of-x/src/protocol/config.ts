/**
 * Proof of X - Protocol Configuration (CKB Testnet Pudge)
 */

import { Hex } from "@ckb-ccc/core";

export interface ProtocolConfig {
  network: "testnet" | "mainnet" | "devnet";
  rpcUrl: string;
  typeScriptCodeHash: Hex;
  typeScriptHashType: "type" | "data" | "data1" | "data2";
  // The authorized issuer lock hash for this deployment / MVP
  authorizedIssuerLockHash: Hex;
  explorerUrl: string;
}

// Default Configuration for Week 5 CKB Testnet (Pudge)
export const DEFAULT_PROTOCOL_CONFIG: ProtocolConfig = {
  network: "testnet",
  rpcUrl: "https://testnet.ckbapp.dev/",
  // Type Script Code Hash:
  // Using standard Type ID or Proof of X custom type script code hash
  typeScriptCodeHash: "0x546573746e657450726f6f664f665854797065536372697074436f6465486173" as Hex,
  typeScriptHashType: "type",
  // Authorized Issuer Lock Hash for Week 5 MVP Demo:
  authorizedIssuerLockHash: "0x9337388cc9779b6a5a15d22ad4060777c380e0b23fe7339703a837e61899f8ec" as Hex,
  explorerUrl: "https://pudge.explorer.nervos.org",
};

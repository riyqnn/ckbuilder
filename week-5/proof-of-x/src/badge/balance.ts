/**
 * Prints the PoX badge balance of an address.
 *
 *   pnpm badge:balance <ckt1... address>
 */

import { ccc } from "@ckb-ccc/core";
import { DEFAULT_PROTOCOL_CONFIG } from "../protocol/config";
import { getBadgeBalance } from "./badge";

const config = DEFAULT_PROTOCOL_CONFIG;

async function main() {
  const address = process.argv[2];
  if (!address) {
    throw new Error("Usage: pnpm badge:balance <address>");
  }

  const client = new ccc.ClientPublicTestnet({ url: config.rpcUrl });
  const { script } = await ccc.Address.fromString(address, client);
  const balance = await getBadgeBalance(client, config.authorizedIssuerLockHash, script);
  console.log(`${address}: ${balance} PoX badge`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

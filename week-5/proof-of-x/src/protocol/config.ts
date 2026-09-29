/**
 * Proof of X - Protocol Configuration (CKB Testnet Pudge)
 *
 * The attestation Type Script runs on ckb-js-vm, so a cell guarded by it carries
 * two scripts' worth of identity:
 *
 *   - the outer script is the ckb-js-vm system script;
 *   - its args name the deployed Proof of X bytecode cell and then our own args.
 *
 * Both cells must be referenced as cellDeps in every issue and revoke
 * transaction, or the script cannot be located and the transaction is rejected.
 */

import { CellDepLike, Hex, HashType } from "@ckb-ccc/core";

export interface DeployedScript {
  codeHash: Hex;
  hashType: HashType;
  cellDep: CellDepLike;
}

export interface ProtocolConfig {
  network: "testnet" | "mainnet" | "devnet";
  rpcUrl: string;
  explorerUrl: string;
  /** The ckb-js-vm system script: the code hash every attestation cell carries. */
  jsVm: DeployedScript;
  /** The Proof of X validator bytecode, deployed Week 6. */
  pox: DeployedScript;
  /** The single authorized issuer for this deployment. */
  authorizedIssuerLockHash: Hex;
}

export const DEFAULT_PROTOCOL_CONFIG: ProtocolConfig = {
  network: "testnet",
  rpcUrl: "https://testnet.ckb.dev",
  explorerUrl: "https://pudge.explorer.nervos.org",

  // System script, from offckb's system-scripts.json for testnet.
  jsVm: {
    codeHash: "0x3e9b6bead927bef62fcb56f0c79f4fbd1b739f32dd222beac10d346f2918bed7",
    hashType: "type",
    cellDep: {
      outPoint: {
        txHash: "0x756fdaf0d1ba1d2e03dc13c71c967b24021bc054893a766ccee6879c468892d2",
        index: 0,
      },
      depType: "code",
    },
  },

  // week-6/pox-type/dist/pox-type.bc, deployed without --type-id: the code hash
  // is the data hash of the bytecode, so the validation rules cannot be swapped
  // out from under attestations that already exist.
  pox: {
    codeHash: "0x98d78fa7216b17ef9501a6ee7dff98a8a9f2ea05b04a593a6ff84782ea5b55ff",
    hashType: "data2",
    cellDep: {
      outPoint: {
        txHash: "0x75f75dfb1ec059c3b815469d389e06056def390d7d9d5855484055593c09f7cc",
        index: 0,
      },
      depType: "code",
    },
  },

  // Lock hash of the Week 6 issuer wallet
  // (ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvwg2cen8extgq8s5puft8vf40px3f599cytcyd8).
  authorizedIssuerLockHash:
    "0x7de82d61a7eb2ec82b0dc653e558ba120efcbfbb44dac87c12972d05bf250653",
};

import "dotenv/config";
import { createSpore, predefinedSporeConfigs } from "@spore-sdk/core";
import { RPC, commons, hd, helpers } from "@ckb-lumos/lumos";

type DobConfig = {
  network: "testnet";
  rpcUrl: string;
  indexerUrl: string;
  privateKey: string;
  name: string;
  description: string;
  contentType: string;
  content: string;
};

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`${name} is required. Copy .env.example to .env and fill it.`);
  }
  return value.trim();
};

const optionalEnv = (name: string) => {
  const value = process.env[name];
  return value?.trim() || undefined;
};

const withPath = (baseUrl: string, path: "rpc" | "indexer") => {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith(`/${path}`)) {
    return trimmed;
  }
  return `${trimmed}/${path}`;
};

const loadConfig = (): DobConfig => {
  const network = requireEnv("CKB_NETWORK");
  if (network !== "testnet") {
    throw new Error("Only CKB_NETWORK=testnet is supported for Week 4 proof.");
  }

  const privateKey = requireEnv("CKB_PRIVATE_KEY");
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("CKB_PRIVATE_KEY must be a 0x-prefixed 32-byte private key.");
  }

  const rpcUrl = requireEnv("CKB_RPC_URL");

  return {
    network,
    rpcUrl: withPath(rpcUrl, "rpc"),
    indexerUrl: optionalEnv("CKB_INDEXER_URL") ?? withPath(rpcUrl, "indexer"),
    privateKey,
    name: requireEnv("DOB_NAME"),
    description: requireEnv("DOB_DESCRIPTION"),
    contentType: requireEnv("DOB_CONTENT_TYPE"),
    content: requireEnv("DOB_CONTENT"),
  };
};

const main = async () => {
  const config = loadConfig();
  const sporeConfig = {
    ...predefinedSporeConfigs.Aggron4,
    ckbNodeUrl: config.rpcUrl,
    ckbIndexerUrl: config.indexerUrl,
  };

  const lockArgs = hd.key.privateKeyToBlake160(config.privateKey);
  const fromAddress = helpers.encodeToConfigAddress(
    lockArgs,
    "SECP256K1_BLAKE160",
    { config: sporeConfig.lumos },
  );
  const toLock = helpers.parseAddress(fromAddress, { config: sporeConfig.lumos });

  const content = new TextEncoder().encode(
    JSON.stringify(
      {
        name: config.name,
        description: config.description,
        content: config.content,
      },
      null,
      2,
    ),
  );

  console.log("DOB minter config valid. Building Spore transaction...");
  console.log(`Network: ${config.network}`);
  console.log(`RPC: ${config.rpcUrl}`);
  console.log(`Indexer: ${config.indexerUrl}`);
  console.log(`From: ${fromAddress}`);
  console.log(`DOB: ${config.name}`);
  console.log(`Content-Type: ${config.contentType}`);

  let txSkeleton = (
    await createSpore({
      data: {
        contentType: config.contentType,
        content,
      },
      toLock,
      fromInfos: [fromAddress],
      changeAddress: fromAddress,
      config: sporeConfig,
    })
  ).txSkeleton;

  txSkeleton = commons.secp256k1Blake160.prepareSigningEntries(txSkeleton, {
    config: sporeConfig.lumos,
  });

  const signingEntries = txSkeleton.get("signingEntries").toArray();
  if (signingEntries.length === 0) {
    throw new Error("No signing entries generated for transaction.");
  }

  const signatures = signingEntries.map((entry) =>
    hd.key.signRecoverable(entry.message, config.privateKey),
  );
  const tx = helpers.sealTransaction(txSkeleton, signatures);
  const txHash = await new RPC(config.rpcUrl).sendTransaction(tx, "passthrough");

  console.log("");
  console.log(`DOB mint transaction sent: ${txHash}`);
  console.log(`Explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
  console.log("Wait until committed, then save terminal + explorer screenshots.");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

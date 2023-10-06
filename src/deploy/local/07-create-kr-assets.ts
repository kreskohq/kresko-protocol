import { testnetConfigs } from "@deploy-config/arbitrumGoerli";
import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/meta";
import { createKrAsset } from "@scripts/create-krasset";

const logger = getLogger("Create KrAsset");

const deploy: DeployFunction = async function (hre) {
  const assets = testnetConfigs[hre.network.name].assets.filter(a => !!a.krAssetConfig || !!a.scdpKrAssetConfig);

  for (const krAsset of assets) {
    const isDeployed = await hre.deployments.getOrNull(krAsset.symbol);
    if (isDeployed != null) continue;
    // Deploy the asset
    logger.log(`${krAsset.name}.`);
    await createKrAsset(krAsset.symbol, krAsset.name ? krAsset.name : krAsset.symbol);
    logger.log(`Success: ${krAsset.name}.`);
  }

  logger.success("Done.");
};

deploy.skip = async hre => {
  const logger = getLogger("deploy-tokens");
  const krAssets = testnetConfigs[hre.network.name].assets.filter(a => !!a.krAssetConfig || !!a.scdpKrAssetConfig);
  if (!krAssets.length) {
    logger.log("Skip: No krAssets configured.");
    return true;
  }
  if (await hre.deployments.getOrNull(krAssets[krAssets.length - 1].symbol)) {
    logger.log("Skip: Create krAssets, already created.");
    return true;
  }
  return false;
};

deploy.tags = ["local", "all", "kresko-assets"];

export default deploy;

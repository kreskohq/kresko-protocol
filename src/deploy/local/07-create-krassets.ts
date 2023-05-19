import { testnetConfigs } from "@deploy-config/opgoerli";
import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import { createKrAsset } from "@scripts/create-krasset";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("create-krassets");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const krAssets = testnetConfigs[hre.network.name].krAssets;

    for (const krAsset of krAssets) {
        const isDeployed = await hre.deployments.getOrNull(krAsset.symbol);
        if (isDeployed != null) continue;
        // Deploy the asset
        logger.log(`Deploying krAsset ${krAsset.name}`);
        await createKrAsset(krAsset.name, krAsset.symbol);
        // Configure stability rates
        logger.log(`Deployed ${krAsset.name}`);
    }

    logger.success("Succesfully deployed krAssets");
};

deploy.skip = async hre => {
    const logger = getLogger("deploy-tokens");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    const isFinished = await hre.deployments.getOrNull(krAssets[krAssets.length - 1].name);
    isFinished && logger.log("Skipping deploying krAssets");
    return !!isFinished || hre.network.live;
};

deploy.tags = ["local", "kresko-assets", "all"];

export default deploy;

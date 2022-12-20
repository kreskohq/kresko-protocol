import { assets, testnetConfigs } from "@deploy-config/testnet-goerli";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { createKrAsset } from "@scripts/create-krasset";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-krasset");
    const krAssets = testnetConfigs[hre.network.name].krAssets;

    // Create KISS first
    const { contract: KISSContract } = await hre.run("deploy-kiss", {
        amount: assets.KISS.mintAmount,
        decimals: 18,
    });

    await hre.Diamond.updateKiss(KISSContract.address);

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
func.skip = async hre => {
    const logger = getLogger("deploy-tokens");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    const isFinished = await hre.deployments.getOrNull(krAssets[krAssets.length - 1].name);
    isFinished && logger.log("Skipping deploying krAssets");
    return !!isFinished;
};

func.tags = ["testnet", "kresko-assets", "all"];

export default func;

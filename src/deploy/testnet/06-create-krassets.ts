import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { createKrAsset } from "@scripts/create-krasset";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "@deploy-config/testnet";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { defaultKrAssetArgs } from "@utils/test";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-krasset");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    for (const krAsset of krAssets) {
        const isDeployed = await hre.deployments.getOrNull(krAsset.symbol);
        if (isDeployed != null) continue;

        logger.log(`Deploying krAsset ${krAsset.name}`);
        if (krAsset.name === "KISS") {
            const { contract } = await hre.run("deploy-kiss", {
                amount: krAsset.mintAmount,
                decimals: 18,
            });
            await hre.Diamond.initializeStabilityRateForAsset(contract.address, defaultKrAssetArgs.stabilityRates);
        } else {
            const asset = await createKrAsset(krAsset.name, krAsset.symbol);
            await hre.Diamond.initializeStabilityRateForAsset(asset.address, defaultKrAssetArgs.stabilityRates);
        }
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

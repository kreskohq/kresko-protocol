import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { createKrAsset } from "@scripts/create-krasset";
import { getLogger } from "@utils/deployment";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "src/config/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-krasset");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    for (const krAsset of krAssets) {
        const isDeployed = await hre.deployments.getOrNull(krAsset.symbol);
        if (isDeployed != null) continue;

        logger.log(`Deploying krAsset ${krAsset.name}`);
        if (krAsset.name === "KISS") {
            await hre.run("deploy-kiss", {
                amount: krAsset.mintAmount,
                decimals: 18,
            });
        } else {
            await createKrAsset(krAsset.name, krAsset.symbol);
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

func.tags = ["minter-test", "testnet", "kresko-assets", "all"];

export default func;

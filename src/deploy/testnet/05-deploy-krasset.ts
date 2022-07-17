import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { testnetConfigs } from "src/deploy-config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-krasset");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    const kresko = await hre.ethers.getContract("Kresko");
    for (const krAsset of krAssets) {
        const isDeployed = await hre.deployments.getOrNull(krAsset.symbol);
        if (isDeployed != null) continue;

        logger.log(`Deploying krAsset ${krAsset.name}`);
        await hre.run("deploy:krasset", {
            name: krAsset.name,
            symbol: krAsset.symbol,
            log: true,
            operator: kresko.address,
        });
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
func.tags = ["testnet", "deploy-krassets"];

export default func;

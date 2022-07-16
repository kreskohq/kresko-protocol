import { getLogger } from "@utils/deployment";
import { fromBig } from "@utils/numbers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "src/deploy-config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("mint-krassets");
    const krAssets = testnetConfigs[hre.network.name].krAssets;

    for (const krAsset of krAssets) {
        if (!krAsset.mintAmount) continue;
        logger.log(`minting ${krAsset.mintAmount} of ${krAsset.name}`);
        await hre.run("mint:krasset", {
            name: krAsset.symbol,
            amount: krAsset.mintAmount,
        });
    }
};
func.tags = ["auroratest", "mint-krassets"];

func.skip = async hre => {
    const logger = getLogger("mint-krassets");
    const krAssets = testnetConfigs[hre.network.name].krAssets;

    const lastAsset = await hre.deployments.get(krAssets[krAssets.length - 1].symbol);

    const { deployer } = await hre.getNamedAccounts();
    const isFinished = fromBig(await hre.kresko.kreskoAssetDebt(deployer, lastAsset.address)) > 0;
    isFinished && logger.log("Skipping minting krAssets");
    return isFinished;
};

export default func;

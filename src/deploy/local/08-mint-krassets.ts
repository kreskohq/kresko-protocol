import { getLogger } from "@utils/deployment";
import { fromBig } from "@utils/numbers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "src/deploy-config";
import { Kresko, KreskoAsset } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("mint-krassets");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    const kresko = await hre.ethers.getContract<Kresko>("Kresko");
    const { deployer } = await hre.getNamedAccounts();

    for (const krAsset of krAssets) {
        const asset = await hre.ethers.getContract<KreskoAsset>(krAsset.symbol);
        const debt = await kresko.kreskoAssetDebt(deployer, asset.address);
        if (!krAsset.mintAmount || debt.gt(0)) continue;
        logger.log(`minting ${krAsset.mintAmount} of ${krAsset.name}`);
        await hre.run("mint:krasset", {
            name: krAsset.symbol,
            amount: krAsset.mintAmount,
        });
    }
};
func.tags = ["testnet", "mint-krassets"];

func.skip = async hre => {
    const logger = getLogger("mint-krassets");
    const krAssets = testnetConfigs[hre.network.name].krAssets;

    const lastAsset = await hre.deployments.get(krAssets[krAssets.length - 1].symbol);
    const kresko = await hre.ethers.getContract<Kresko>("Kresko");
    const { deployer } = await hre.getNamedAccounts();
    const isFinished = fromBig(await kresko.kreskoAssetDebt(deployer, lastAsset.address)) > 0;
    isFinished && logger.log("Skipping minting krAssets");
    return isFinished;
};

export default func;

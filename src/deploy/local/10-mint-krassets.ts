import { testnetConfigs } from "@deploy-config/opgoerli";
import { fromBig, getLogger, toBig } from "@kreskolabs/lib";
import { TASK_MINT_OPTIMAL } from "@tasks";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("mint-krassets");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const krAssets = testnetConfigs[hre.network.name].krAssets;

    const kresko = await hre.getContractOrFork("Kresko");
    const { deployer } = await hre.ethers.getNamedSigners();

    const DAI = await hre.getContractOrFork("MockERC20", "DAI");

    await DAI.mint(deployer.address, toBig(2_500_000_000));
    await DAI.approve(kresko.address, hre.ethers.constants.MaxUint256);
    await kresko.connect(deployer).depositCollateral(deployer.address, DAI.address, toBig(2_500_000_000));

    await kresko.mintKreskoAsset(deployer.address, (await hre.getContractOrFork("KISS")).address, toBig(1200_000_000));

    for (const krAsset of krAssets) {
        const asset = await hre.getContractOrFork("KreskoAsset", krAsset.symbol);
        const debt = await kresko.kreskoAssetDebt(deployer.address, asset.address);

        if (!krAsset.mintAmount || debt.gt(0) || krAsset.symbol === "KISS") {
            logger.log(`Skipping minting ${krAsset.symbol}`);
            continue;
        }
        logger.log(`minting ${krAsset.mintAmount} of ${krAsset.name}`);

        await hre.run(TASK_MINT_OPTIMAL, {
            kreskoAsset: krAsset.symbol,
            amount: krAsset.mintAmount,
        });
    }
};
deploy.tags = ["local", "mint-krassets"];
deploy.dependencies = ["collaterals"];

deploy.skip = async hre => {
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    const kresko = await hre.getContractOrFork("Kresko");
    const lastAsset = await hre.deployments.get(krAssets[krAssets.length - 1].symbol);

    const { deployer } = await hre.getNamedAccounts();
    const isFinished = fromBig(await kresko.kreskoAssetDebt(deployer, lastAsset.address)) > 0;
    if (isFinished) {
        logger.log("Skipping minting krAssets");
    }
    return isFinished || hre.network.live;
};

export default deploy;

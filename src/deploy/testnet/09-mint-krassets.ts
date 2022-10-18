import { testnetConfigs } from "@deploy-config/testnet";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { fromBig, toBig } from "@kreskolabs/lib";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { KreskoAsset, MockERC20 } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("mint-krassets");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    const kresko = hre.Diamond;
    const users = await hre.getUsers();
    const { deployer } = await hre.getNamedAccounts();

    const DAI = await hre.ethers.getContract<MockERC20>("DAI");

    await DAI.mint(users.deployer.address, toBig(2_000_000_000));
    await DAI.approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    await hre.Diamond.connect(users.deployer).depositCollateral(
        users.deployer.address,
        DAI.address,
        toBig(2_000_000_000),
    );

    await hre.Diamond.connect(users.deployer).mintKreskoAsset(
        users.deployer.address,
        (
            await hre.ethers.getContract("KISS")
        ).address,
        toBig(500_000_000),
    );

    for (const krAsset of krAssets) {
        const asset = await hre.ethers.getContract<KreskoAsset>(krAsset.symbol);
        const debt = await kresko.kreskoAssetDebt(deployer, asset.address);
        if (!krAsset.mintAmount || debt.gt(0) || krAsset.symbol === "KISS") {
            console.log(`Skipping minting ${krAsset.symbol}`);
            continue;
        }
        logger.log(`minting ${krAsset.mintAmount} of ${krAsset.name}`);
        await hre.run("mint-krasset", {
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
    const kresko = hre.Diamond;
    const { deployer } = await hre.getNamedAccounts();
    const isFinished = fromBig(await kresko.kreskoAssetDebt(deployer, lastAsset.address)) > 0;
    isFinished && logger.log("Skipping minting krAssets");
    return isFinished;
};

export default func;

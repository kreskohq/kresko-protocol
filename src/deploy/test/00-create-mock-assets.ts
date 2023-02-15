import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";

const func: DeployFunction = async function (hre) {
    const logger = getLogger("deploy-oracle");
    if (!hre.Diamond) {
        throw new Error("No diamond deployed");
    }
    const { deployer } = await hre.ethers.getNamedSigners();
    const feedValidator = new hre.ethers.Wallet(process.env.FEED_VALIDATOR_PK).connect(hre.ethers.provider);
    if ((await hre.ethers.provider.getBalance(feedValidator.address)).eq(0)) {
        await deployer.sendTransaction({
            to: feedValidator.address,
            value: hre.ethers.utils.parseEther("10"),
        });
    }
    await addMockCollateralAsset();
    await addMockKreskoAsset();

    logger.log("Added mock assets");
};

func.tags = ["minter-test", "mock-assets"];
func.dependencies = ["minter-init"];

func.skip = async hre => hre.network.name !== "hardhat";
export default func;

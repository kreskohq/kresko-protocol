import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";

const func: DeployFunction = async function (hre) {
    const logger = getLogger("mock-assets");
    if (!hre.Diamond) {
        throw new Error("No diamond deployed");
    }

    const { deployer, feedValidator } = await hre.ethers.getNamedSigners();

    if (hre.network.name === "hardhat" && (await hre.ethers.provider.getBalance(feedValidator.address)).eq(0)) {
        await deployer.sendTransaction({
            to: feedValidator.address,
            value: hre.ethers.utils.parseEther("10"),
        });
    }
    await addMockCollateralAsset();
    await addMockKreskoAsset();

    logger.log("Added mock assets");
};

func.tags = ["local", "minter-test", "mock-assets"];
func.dependencies = ["minter-init"];

func.skip = async hre => hre.network.name !== "hardhat";
export default func;

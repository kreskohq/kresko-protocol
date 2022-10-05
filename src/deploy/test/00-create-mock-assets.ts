import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { addMockCollateralAsset, addMockKreskoAsset } from "@utils/test";

const func: DeployFunction = async function (hre) {
    const logger = getLogger("deploy-oracle");
    if (!hre.Diamond) {
        throw new Error("No diamond deployed");
    }
    await addMockCollateralAsset();
    await addMockKreskoAsset();

    logger.log("Added mock assets");
};

func.tags = ["minter-test", "mock-assets"];
func.dependencies = ["minter-init"];
export default func;

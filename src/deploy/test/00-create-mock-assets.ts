import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
import { defaultCollateralArgs, defaultKrAssetArgs } from "@utils/test";

const func: DeployFunction = async function (hre) {
    const logger = getLogger("mock-assets");
    if (!hre.Diamond) {
        throw new Error("No diamond deployed");
    }

    await addMockCollateralAsset();
    await addMockCollateralAsset({
        ...defaultCollateralArgs,
        name: "MockCollateral2",
        redstoneId: "MockCollateral2",
        symbol: "MockCollateral2",
        decimals: 18,
    });
    await addMockCollateralAsset({
        ...defaultCollateralArgs,
        name: "MockCollateral8Dec",
        redstoneId: "MockCollateral8Dec",
        symbol: "MockCollateral8Dec",
        decimals: 8,
    });
    await addMockKreskoAsset();
    await addMockKreskoAsset({
        ...defaultKrAssetArgs,
        name: "MockKreskoAsset2",
        redstoneId: "MockKreskoAsset2",
        symbol: "MockKreskoAsset2",
    });
    await addMockKreskoAsset(
        {
            ...defaultKrAssetArgs,
            name: "MockKreskoAssetCollateral",
            redstoneId: "MockKreskoAssetCollateral",
            symbol: "MockKreskoAssetCollateral",
        },
        true,
    );

    logger.log("Added mock assets");
};

func.tags = ["local", "minter-test", "mock-assets"];
func.dependencies = ["minter-init"];

func.skip = async hre => hre.network.name !== "hardhat";
export default func;

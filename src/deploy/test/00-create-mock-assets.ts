import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import { addMockExtAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
import { testCollateralConfig, testKrAssetConfig } from "@utils/test/mocks";

const func: DeployFunction = async function (hre) {
    const logger = getLogger("mock-assets");
    if (!hre.Diamond) {
        throw new Error("No diamond deployed");
    }

    await addMockExtAsset();
    await addMockExtAsset({
        ...testCollateralConfig,
        underlyingId: "Collateral2",
        symbol: "Collateral2",
        decimals: 18,
    });
    await addMockExtAsset({
        ...testCollateralConfig,
        underlyingId: "Coll8Dec",
        symbol: "Coll8Dec",
        decimals: 8,
    });
    await addMockKreskoAsset();
    await addMockKreskoAsset({
        ...testKrAssetConfig,
        underlyingId: "KrAsset2",
        symbol: "KrAsset2",
    });
    await addMockKreskoAsset({
        ...testKrAssetConfig,
        underlyingId: "KrAsset3",
        symbol: "KrAsset3",
        collateralConfig: testCollateralConfig.collateralConfig,
    });

    logger.log("Added mock assets");
};

func.tags = ["local", "minter-test", "mock-assets"];
func.dependencies = ["minter-init"];

func.skip = async hre => hre.network.name !== "hardhat";
export default func;

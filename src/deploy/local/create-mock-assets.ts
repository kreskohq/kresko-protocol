import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { addMockCollateralAsset, addMockKreskoAsset } from "@utils/test/helpers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { Diamond } = hre;
    if (!Diamond.address) {
        throw new Error("Diamond not deployed");
    }
    // await addMockCollateralAsset();
    // await addMockKreskoAsset();
};

func.tags = ["local", "minter-with-mocks", "all"];
func.dependencies = ["minter-init"];

export default func;

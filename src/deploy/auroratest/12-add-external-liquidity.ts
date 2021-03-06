import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    await hre.run("addliquidity:external", { log: true });
};

func.tags = ["auroratest", "liquidity", "uniswap"];

export default func;

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { toBig } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const weth = await hre.ethers.getContract("WETH");

    await weth.deposit(toBig(500, 18));

    await hre.run("addliquidity:external", { log: true });
};

func.tags = ["auroratest", "liquidity", "uniswap"];

func.skip = async () => true;
export default func;

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { toBig } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const weth = await hre.ethers.getContract("WETH");

    await weth.deposit(toBig(500, 18));

    await hre.run("addliquidity:external", { log: true });
};

func.tags = ["auroratest", "liquidity", "uniswap"];

export default func;

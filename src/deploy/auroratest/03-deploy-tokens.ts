import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { toBig } from "@utils/numbers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-tokens");

    const USDC: Token = await hre.run("deploy:token", {
        name: "USDC",
        symbol: "USDC",
        log: true,
        decimals: 6,
    });

    const AURORA: Token = await hre.run("deploy:token", {
        name: "Aurora",
        symbol: "AURORA",
        log: true,
    });

    const NEAR: Token = await hre.run("deploy:token", {
        name: "Wrapped Near",
        symbol: "wNEAR",
        log: true,
    });

    const WETH = await hre.ethers.getContract("WETH");

    // Give deployer some WETH
    await WETH.deposit(toBig(500, 18));
    logger.log("deposited weth for deployer");

    const contracts = {
        USDC: USDC.address,
        wNEAR: NEAR.address,
        AURORA: AURORA.address,
        WETH: WETH.address,
    };

    logger.table(contracts);
    logger.success("Succesfully deployed mock tokens");
};

func.tags = ["auroratest"];

func.skip = async hre => {
    const logger = getLogger("deploy-tokens");

    const isFinished = await hre.deployments.getOrNull("wNEAR");
    isFinished && logger.log("Skipping deploying mock tokens");
    return !!isFinished;
};

export default func;

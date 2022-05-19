import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-tokens");

    const USDC: Token = await hre.run("deploy:token", {
        name: "USDC",
        symbol: "USDC",
        wait: 2,
        log: true,
        decimals: 6,
    });

    const AURORA: Token = await hre.run("deploy:token", {
        name: "Aurora",
        symbol: "AURORA",
        wait: 2,
        log: true,
    });

    const NEAR: Token = await hre.run("deploy:token", {
        name: "Wrapped Near",
        symbol: "wNEAR",
        wait: 2,
        log: true,
    });

    const WETH = await hre.ethers.getContract("Wrapped Ether");

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

    const isFinished = await hre.deployments.getOrNull("Wrapped Ether");
    isFinished && logger.log("Skipping deploying mock tokens");
    return !!isFinished;
};

export default func;

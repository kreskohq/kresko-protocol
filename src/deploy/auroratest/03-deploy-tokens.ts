import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { toBig } from "@utils/numbers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-tokens");
    const USDCDeployed = await hre.deployments.getOrNull("USDC");
    let USDC: Token | undefined;
    if (!USDCDeployed) {
        USDC = await hre.run("deploy:token", {
            name: "USDC",
            symbol: "USDC",
            log: true,
            decimals: 6,
        });
    } else {
        logger.log("Skipping deploying USDC");
    }
    const AuroraDeployed = await hre.deployments.getOrNull("AURORA");

    let AURORA: Token | undefined;
    if (!AuroraDeployed) {
        AURORA = await hre.run("deploy:token", {
            name: "Aurora",
            symbol: "AURORA",
            log: true,
        });
    } else {
        logger.log("Skipping deploying Aurora");
    }

    const NearDeployed = await hre.deployments.getOrNull("wNEAR");

    let NEAR: Token | undefined;
    if (!NearDeployed) {
        NEAR = await hre.run("deploy:token", {
            name: "Wrapped Near",
            symbol: "wNEAR",
            log: true,
        });
    } else {
        logger.log("Skipping deploying wNEAR");
    }
    const WETH = await hre.ethers.getContract("WETH");

    // Give deployer some WETH
    await WETH.deposit(toBig(500, 18));
    logger.log("deposited weth for deployer");

    const contracts = {
        USDC: USDC ? USDC.address : USDCDeployed.address,
        wNEAR: NEAR ? NEAR.address : NearDeployed.address,
        AURORA: AURORA ? AURORA.address : AuroraDeployed.address,
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

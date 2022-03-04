import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const USDC: Token = await hre.run("deploy:token", {
        name: "USDC",
        symbol: "USDC",
        log: true,
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

    const contracts = {
        USDC: USDC.address,
        NEAR: NEAR.address,
        AURORA: AURORA.address,
    };
    console.table(contracts);
};

func.tags = ["auroratest"];

export default func;

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { MockWETH10 } from "types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-tokens");
    const { deployer } = await hre.getNamedAccounts();
    const USDC: Token = await hre.run("deploy:token", {
        name: "USDC",
        symbol: "USDC",
        wait: 3,
        log: true,
        decimals: 6,
    });

    const AURORA: Token = await hre.run("deploy:token", {
        name: "Aurora",
        symbol: "AURORA",
        wait: 3,
        log: true,
    });

    const NEAR: Token = await hre.run("deploy:token", {
        name: "Wrapped Near",
        symbol: "wNEAR",
        wait: 3,
        log: true,
    });

    const [WETH] = await hre.deploy<MockWETH10>("Wrapped Ether", {
        contract: "MockWETH10",
        from: deployer,
        waitConfirmations: 3,
        log: true,
    });

    const contracts = {
        USDC: USDC.address,
        NEAR: NEAR.address,
        AURORA: AURORA.address,
        WETH: WETH.address,
    };
    console.table(contracts);
    logger.success("Succesfully deployed mock tokens");
};

func.tags = ["auroratest"];

export default func;

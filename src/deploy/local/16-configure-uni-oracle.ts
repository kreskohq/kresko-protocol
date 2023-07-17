import { getLogger } from "@kreskolabs/lib";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("UniV2Oracle");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    logger.log("Deploying UniV2Oracle");
    const { deployer } = await hre.getNamedAccounts();
    const Factory = await hre.deployments.get("UniswapV2Factory");

    const [UniV2Oracle] = await hre.deploy("UniswapV2Oracle", {
        from: deployer,
        args: [Factory.address, deployer],
    });
    hre.UniV2Oracle = UniV2Oracle;

    await hre.Diamond.updateAMMOracle(UniV2Oracle.address);
    await hre.Diamond.updateKiss((await hre.deployments.get("KISS")).address);

    logger.success("UniV2Oracle deployed successfully");
};

deploy.tags = ["local", "uniswap", "uniswap-oracle"];
// deploy.skip = async hre => hre.network.live;

export default deploy;

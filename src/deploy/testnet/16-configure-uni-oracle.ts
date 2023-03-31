import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { getLogger } from "@kreskolabs/lib";
import { deployments } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("UniV2Oracle", true);
    const { deployer } = await hre.getNamedAccounts();
    const Factory = await deployments.get("UniswapV2Factory");

    const [UniV2Oracle] = await hre.deploy("UniswapV2Oracle", {
        from: deployer,
        args: [Factory.address, deployer],
    });
    hre.UniV2Oracle = UniV2Oracle;
    await hre.Diamond.updateAMMOracle(UniV2Oracle.address);
    await hre.Diamond.updateKiss((await deployments.get("KISS")).address);
    logger.success("UniV2Oracle deployed successfully");
};

func.tags = ["testnet", "uniswap", "uniswap-oracle"];
export default func;

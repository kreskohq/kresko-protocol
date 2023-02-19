import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import type { UniswapV2Factory, UniswapV2Router02 } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-uniswap");
    const { getNamedAccounts, deploy } = hre;
    const { deployer } = await getNamedAccounts();

    const [UniFactory] = await deploy<UniswapV2Factory>("UniswapV2Factory", {
        from: deployer,
        args: [deployer],
    });

    const WETHDeployment = await hre.deployments.getOrNull("WETH");
    let WETHAddress = "";

    if (!WETHDeployment) {
        const [WETH] = await hre.deploy("WETH");
        WETHAddress = WETH.address;
    } else {
        WETHAddress = WETHDeployment.address;
    }

    console.log("unirouter", UniFactory.address, WETHAddress);
    const [UniRouter] = await deploy<UniswapV2Router02>("UniswapV2Router02", {
        from: deployer,
        args: [UniFactory.address, WETHAddress],
    });

    const contracts = {
        WETH: WETHAddress,
        UniV2Factory: UniFactory.address,
        UniRouter: UniRouter.address,
    };
    hre.UniV2Factory = UniFactory;
    hre.UniV2Router = UniRouter;

    logger.table(contracts);
    logger.success("Succesfully deployed uniswap contracts");
};
func.tags = ["testnet", "uniswap"];

export default func;

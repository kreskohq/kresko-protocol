import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("deploy-uniswap");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();

    const [UniFactory] = await hre.deploy("UniswapV2Factory", {
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

    const [UniRouter] = await hre.deploy("UniswapV2Router02", {
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

    console.table(contracts);
    logger.success("Succesfully deployed uniswap contracts");
};

deploy.tags = ["local", "uniswap"];
deploy.skip = async () => true;
// deploy.skip = async hre => hre.network.live;

export default deploy;

import { getLogger } from "@utils/deployment";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { UniswapV2Factory, UniswapV2Router02 } from "types";
import type { WETH } from "types/typechain/src/contracts/test/WETH";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-uniswap");
    const { getNamedAccounts, deploy } = hre;
    const { deployer } = await getNamedAccounts();

    const [UniFactory] = await deploy<UniswapV2Factory>("UniswapV2Factory", {
        from: deployer,
        args: [deployer],
    });

    const WETH = await hre.ethers.getContract<WETH>("WETH");

    const [UniRouter] = await deploy<UniswapV2Router02>("UniswapV2Router02", {
        from: deployer,
        args: [UniFactory.address, WETH.address],
    });

    const contracts = {
        WETH: WETH.address,
        UniV2Factory: UniFactory.address,
        UniRouter: UniRouter.address,
    };

    logger.table(contracts);
    logger.success("Succesfully deployed uniswap contracts");
};
func.tags = ["testnet", "uniswap"];

export default func;

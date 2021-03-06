import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { UniswapV2Factory, UniswapV2Router02 } from "types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-uniswap");
    const { getNamedAccounts, deploy } = hre;
    const { admin } = await getNamedAccounts();

    const [UniFactory] = await deploy<UniswapV2Factory>("UniswapV2Factory", {
        from: admin,
        waitConfirmations: 2,
        args: [admin],
    });

    const [WETH] = await deploy<WETH9>("WETH9", {
        from: admin,
        waitConfirmations: 2,
    });

    const [UniRouter] = await deploy<UniswapV2Router02>("UniswapV2Router02", {
        from: admin,
        waitConfirmations: 2,
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

export default func;

func.tags = ["auroratest"];

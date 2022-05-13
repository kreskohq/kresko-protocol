import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { MockWETH10, UniswapV2Factory, UniswapV2Router02 } from "types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-uniswap");
    const { getNamedAccounts, deploy } = hre;
    const { admin } = await getNamedAccounts();

    const [UniFactory] = await deploy<UniswapV2Factory>("UniswapV2Factory", {
        from: admin,
        args: [admin],
    });

    const [WETH] = await hre.deploy<MockWETH10>("WETH", {
        contract: "MockWETH10",
        from: admin,
        log: true,
    });

    const [UniRouter] = await deploy<UniswapV2Router02>("UniswapV2Router02", {
        from: admin,
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
func.tags = ["auroratest"];

export default func;

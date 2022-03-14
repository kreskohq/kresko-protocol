import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { UniswapV2Factory, UniswapV2Router02 } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { getNamedAccounts, deploy } = hre;
    const { admin } = await getNamedAccounts();

    const [UniFactory] = await deploy<UniswapV2Factory>("UniswapV2Factory", {
        from: admin,
        waitConfirmations: 3,
        args: [admin],
    });

    const [WETH] = await deploy<WETH9>("WETH9", {
        from: admin,
        waitConfirmations: 3,
    });

    const [UniRouter] = await deploy<UniswapV2Router02>("UniswapV2Router02", {
        from: admin,
        waitConfirmations: 3,
        args: [UniFactory.address, WETH.address],
    });

    const contracts = {
        WETH: WETH.address,
        UniV2Factory: UniFactory.address,
        UniRouter: UniRouter.address,
    };

    console.table(contracts);
};

export default func;

func.tags = ["auroratest"];

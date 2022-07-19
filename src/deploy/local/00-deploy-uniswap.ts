import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { MockWETH10, UniswapV2Factory, UniswapV2Router02 } from "types";
import { getLogger } from "@utils/deployment";
import { NonceManager } from "@ethersproject/experimental";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-uniswap");
    const { getNamedAccounts, deploy } = hre;
    const { admin } = await getNamedAccounts();

    // Increase nonce a bit for different address space
    if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
        const { deployer } = await hre.ethers.getNamedSigners();

        const nonceIncreaseCount = [...Array(150).keys()];
        const nonceManager = new NonceManager(deployer);
        for (const count of nonceIncreaseCount) {
            await deployer.sendTransaction({ to: deployer.address, data: "0x1337", value: "0" });
            nonceManager.incrementTransactionCount();
        }

        console.log(await deployer.getTransactionCount());
    }

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
func.tags = ["testnet", "uniswap"];

export default func;

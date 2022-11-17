import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { UniswapV2Oracle } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("UniV2Oracle", true);

    const [UniV2Oracle] = await hre.deploy<UniswapV2Oracle>("UniswapV2Oracle", {
        from: (await hre.getUsers()).deployer.address,
        args: [hre.UniV2Factory.address],
    });
    hre.UniV2Oracle = UniV2Oracle;
    await hre.Diamond.updateAMMOracle(UniV2Oracle.address);
    logger.success("UniV2Oracle deployed successfully");
};

func.tags = ["testnet", "uniswap", "uniswap-oracle"];
export default func;
